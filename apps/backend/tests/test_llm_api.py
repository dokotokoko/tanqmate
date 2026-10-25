import asyncio
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from module.llm_api import LLMContentFilterError, learning_plannner


def response(text="考えを整理してみよう。", status="completed", output=None):
    return SimpleNamespace(status=status, output_text=text, output=output or [], usage=None)


class EventStream:
    def __init__(self, items):
        self.items = items
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        self.closed = True

    async def __aiter__(self):
        for item in self.items:
            yield item


class TestLLMClient(unittest.TestCase):
    def setUp(self):
        self.settings = {
            "OPENAI_API_KEY": "test-key",
            "LLM_REASONING_TOKEN_BUDGET": "4096",
            "LLM_DEFAULT_TEXT_TOKEN_BUDGET": "4096",
        }
        with patch.dict(os.environ, self.settings), patch("module.llm_api.load_dotenv"), \
                patch("module.llm_api.OpenAI"), patch("module.llm_api.AsyncOpenAI"):
            self.client = learning_plannner(pool_size=1)
        self.sync_create = Mock(return_value=response())
        self.async_create = AsyncMock(return_value=response())
        self.client.client = SimpleNamespace(responses=SimpleNamespace(create=self.sync_create))
        self.client.async_client = SimpleNamespace(responses=SimpleNamespace(create=self.async_create))
        self.input_items = [self.client.text("user", "学校のごみについて探究したい")]

    def assert_primary_request(self, params, text_budget):
        self.assertEqual(params["model"], "gpt-6-luna")
        self.assertEqual(params["reasoning"], {"effort": "medium"})
        self.assertEqual(params["text"], {"verbosity": "low"})
        self.assertEqual(params["input"], self.input_items)
        self.assertEqual(params["tools"], [{"type": "web_search"}])
        self.assertTrue(params["store"])
        self.assertEqual(params["max_output_tokens"], text_budget + 4096)
        self.assertNotIn("temperature", params)
        self.assertNotIn("top_p", params)

    def test_sync_reserves_reasoning_space_for_short_output(self):
        result = self.client.generate_response(self.input_items, max_tokens=260)
        self.assertEqual(result.status, "completed")
        self.assert_primary_request(self.sync_create.call_args.kwargs, 260)

    def test_async_uses_the_same_model_effort_and_budget(self):
        result = asyncio.run(self.client.generate_response_async(self.input_items, max_tokens=600))
        self.assertEqual(result.status, "completed")
        self.assert_primary_request(self.async_create.call_args.kwargs, 600)

    def test_web_search_entry_points_share_the_defaults(self):
        self.client.generate_response_with_WebSearch(self.input_items)
        self.assert_primary_request(self.sync_create.call_args.kwargs, 4096)
        asyncio.run(self.client.generate_with_web_search_async(self.input_items))
        self.assert_primary_request(self.async_create.call_args.kwargs, 4096)

    def test_total_budget_is_capped_at_the_model_output_limit(self):
        self.client.generate_response(self.input_items, max_tokens=128000)
        self.assertEqual(self.sync_create.call_args.kwargs["max_output_tokens"], 128000)

    def test_reasoning_and_default_text_budgets_are_configurable(self):
        with patch.dict(os.environ, {**self.settings, "LLM_REASONING_TOKEN_BUDGET": "2048",
                                     "LLM_DEFAULT_TEXT_TOKEN_BUDGET": "1024"}), \
                patch("module.llm_api.load_dotenv"), patch("module.llm_api.OpenAI"), \
                patch("module.llm_api.AsyncOpenAI"):
            client = learning_plannner(pool_size=1)
        self.assertEqual(client._build_request_params(self.input_items)["max_output_tokens"], 3072)

    def test_invalid_budgets_fail_before_any_api_call(self):
        for key, value in (("LLM_REASONING_TOKEN_BUDGET", "0"),
                           ("LLM_REASONING_TOKEN_BUDGET", "128000"),
                           ("LLM_DEFAULT_TEXT_TOKEN_BUDGET", "-1")):
            with self.subTest(key=key, value=value), patch.dict(os.environ, {**self.settings, key: value}), \
                    patch("module.llm_api.load_dotenv"), patch("module.llm_api.OpenAI") as constructor:
                with self.assertRaises(ValueError):
                    learning_plannner(pool_size=1)
                constructor.assert_not_called()
        with self.assertRaises(ValueError):
            self.client.generate_response(self.input_items, max_tokens=0)
        self.sync_create.assert_not_called()

    def test_incomplete_sync_response_is_not_returned_as_success(self):
        for status in ("incomplete", "failed", "cancelled", "in_progress"):
            with self.subTest(status=status):
                self.sync_create.return_value = response("partial JSON", status=status)
                with self.assertRaisesRegex(RuntimeError, "did not complete"):
                    self.client.generate_response(self.input_items)

    def test_no_visible_text_never_returns_the_response_representation(self):
        reasoning_item = SimpleNamespace(type="reasoning", summary="private internal content")
        for text in ("", "   ", None):
            with self.subTest(text=text):
                with self.assertRaisesRegex(RuntimeError, "did not contain output text") as error:
                    self.client.extract_output_text(response(text, output=[reasoning_item]))
                self.assertNotIn("private internal content", str(error.exception))

    def test_message_text_is_extracted_when_sdk_has_no_output_text(self):
        message = SimpleNamespace(type="message", content=[SimpleNamespace(type="output_text", text="本文")])
        self.assertEqual(self.client.extract_output_text(response("", output=[message])), "本文")

    def test_refusal_is_returned_without_retrying_another_model(self):
        refusal = SimpleNamespace(type="message", content=[
            SimpleNamespace(type="refusal", refusal="その依頼には対応できません。")
        ])
        self.async_create.return_value = response("", output=[refusal])
        with patch.object(self.client, "_lightweight_fallback", new_callable=AsyncMock) as fallback:
            result = asyncio.run(self.client.generate_response_async(self.input_items))
        self.assertEqual(self.client.extract_output_text(result), "その依頼には対応できません。")
        fallback.assert_not_called()

    def test_async_incomplete_or_empty_primary_uses_existing_fallback(self):
        for primary in (response("partial", status="incomplete"), response("")):
            with self.subTest(status=primary.status, text=primary.output_text):
                self.async_create.return_value = primary
                fallback_create = AsyncMock(return_value=response("fallback reply"))
                fallback_client = SimpleNamespace(responses=SimpleNamespace(create=fallback_create))
                with patch("module.llm_api.AsyncOpenAI", return_value=fallback_client):
                    result = asyncio.run(self.client.generate_response_async(self.input_items, max_tokens=260))
                self.assertTrue(result.fallback_used)
                self.assertEqual(result.fallback_model, "gpt-4o-mini")
                params = fallback_create.call_args.kwargs
                self.assertEqual(params["model"], "gpt-4o-mini")
                self.assertEqual(params["max_output_tokens"], 260)
                for unsupported in ("reasoning", "text", "tools"):
                    self.assertNotIn(unsupported, params)

    def test_fallback_must_also_have_a_complete_visible_reply(self):
        self.async_create.side_effect = RuntimeError("primary unavailable")
        fallback_client = SimpleNamespace(responses=SimpleNamespace(create=AsyncMock(return_value=response(""))))
        with patch("module.llm_api.AsyncOpenAI", return_value=fallback_client):
            with self.assertRaisesRegex(RuntimeError, "did not contain output text"):
                asyncio.run(self.client.generate_response_async(self.input_items))

    def test_content_filter_does_not_trigger_another_model(self):
        blocked = response("partial", status="incomplete")
        blocked.incomplete_details = SimpleNamespace(reason="content_filter")
        self.async_create.return_value = blocked
        with patch.object(self.client, "_lightweight_fallback", new_callable=AsyncMock) as fallback:
            with self.assertRaises(LLMContentFilterError):
                asyncio.run(self.client.generate_response_async(self.input_items))
        fallback.assert_not_called()

    def test_explicit_fallback_does_not_retry_content_filter_interruptions(self):
        with patch.object(self.client, "generate_response_async", new_callable=AsyncMock,
                          side_effect=LLMContentFilterError("blocked")):
            with self.assertRaises(LLMContentFilterError):
                asyncio.run(self.client.generate_with_fallback(self.input_items))
        self.async_create.assert_not_called()

    def test_explicit_fallback_keeps_its_non_reasoning_parameters(self):
        with patch.object(self.client, "generate_response_async", new_callable=AsyncMock,
                          side_effect=RuntimeError("primary unavailable")):
            asyncio.run(self.client.generate_with_fallback(
                self.input_items, fallback_model="gpt-4o-mini", max_tokens=300))
        params = self.async_create.call_args.kwargs
        self.assertEqual(params["model"], "gpt-4o-mini")
        self.assertEqual(params["max_output_tokens"], 300)
        self.assertNotIn("reasoning", params)

    def test_successful_stream_yields_only_visible_text(self):
        self.async_create.return_value = EventStream([
            SimpleNamespace(type="response.reasoning_summary_text.delta", delta="internal"),
            SimpleNamespace(type="response.output_text.delta", delta="考えを"),
            SimpleNamespace(type="response.output_text.delta", delta="整理しよう"),
            SimpleNamespace(type="response.completed", response=response("考えを整理しよう")),
        ])
        callback = AsyncMock()

        async def collect():
            return [part async for part in self.client.generate_response_streaming(
                self.input_items, callback=callback, max_tokens=600)]

        self.assertEqual(asyncio.run(collect()), ["考えを", "整理しよう"])
        self.assertEqual(callback.await_count, 2)
        self.assert_primary_request(self.async_create.call_args.kwargs, 600)
        self.assertTrue(self.async_create.call_args.kwargs["stream"])
        self.assertTrue(self.async_create.return_value.closed)

    def test_stream_failure_is_not_silently_treated_as_completion(self):
        for event_type in ("error", "response.failed", "response.incomplete"):
            with self.subTest(event_type=event_type):
                self.async_create.return_value = EventStream([
                    SimpleNamespace(type=event_type, error="private provider payload")
                ])

                async def collect():
                    return [part async for part in self.client.generate_response_streaming(self.input_items)]

                with self.assertRaisesRegex(RuntimeError, "did not complete") as error:
                    asyncio.run(collect())
                self.assertNotIn("private provider payload", str(error.exception))
                self.assertTrue(self.async_create.return_value.closed)

    def test_stream_cut_off_before_completion_raises(self):
        self.async_create.return_value = EventStream([
            SimpleNamespace(type="response.output_text.delta", delta="partial")
        ])

        async def collect():
            return [part async for part in self.client.generate_response_streaming(self.input_items)]

        with self.assertRaisesRegex(RuntimeError, "ended before completion"):
            asyncio.run(collect())
        self.assertTrue(self.async_create.return_value.closed)

    def test_chat_debug_logs_neither_text_nor_reasoning_payloads(self):
        from services.chat_service import ChatService

        private_response = response("private reply", output=[
            SimpleNamespace(type="message", content="private conversation"),
            SimpleNamespace(type="reasoning", encrypted_content="private reasoning"),
        ])
        with self.assertLogs("services.chat_service", level="INFO") as logs:
            ChatService.dump_response_events(None, private_response)
        log_output = " ".join(logs.output)
        self.assertIn("reasoning", log_output)
        self.assertNotIn("private", log_output)


if __name__ == "__main__":
    unittest.main()
