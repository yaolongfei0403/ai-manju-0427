"""Tests for VolcT2IService using httpx AsyncMock."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.core.model_config.services.t2i_service import VolcT2IService
from backend.app.core.model_config.types import ModelConfigEntry


@pytest.fixture
def entry():
    return ModelConfigEntry(
        provider="volc",
        model="seedream-4.5",
        api_key="test-key",
        endpoint="https://visual.volc.com/api/v1",
        timeout=60.0,
        extra={"style": "realistic", "resolution": "1024x1024"},
    )


@pytest.fixture
def mock_api_response():
    return {"code": 200, "data": [{"url": "https://example.com/image.png"}]}


@pytest.mark.asyncio
async def test_volc_t2i_generate_success(entry, mock_api_response, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))

    service = VolcT2IService(entry)

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = AsyncMock(return_value=mock_api_response)
    mock_response.content = b"fake-image-bytes"
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("backend.app.core.model_config.services.t2i_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        result = await service.generate("a beautiful landscape")

    assert result.startswith("/uploads/assets/")
    assert result.endswith(".png")


@pytest.mark.asyncio
async def test_volc_t2i_raises_on_http_error(entry, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))
    service = VolcT2IService(entry)

    error_response = AsyncMock()
    error_response.status_code = 400
    error_response.text = "Bad Request"

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=error_response)

    with patch("backend.app.core.model_config.services.t2i_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        with pytest.raises(RuntimeError) as exc:
            await service.generate("prompt")
    assert "400" in str(exc.value)