"""Tests for CapabilityCatalog — ensure_capability and validate."""

import pytest
from backend.app.core.model_config.catalog import CapabilityCatalog
from backend.app.core.model_config.types import CapabilityError


CATALOG_YAML = """
capabilities:
  test_provider:
    test-model-float:
      type: llm
      provider: test_provider
      params:
        temperature:
          type: float
          range: [0.0, 2.0]
          default: 0.7
        top_p:
          type: float
          range: [0.0, 1.0]
          default: 0.9

    test-model-str:
      type: t2i
      provider: test_provider
      params:
        style:
          type: str
          options: ["realistic", "anime"]
          default: "realistic"

    test-model-bool:
      type: i2v
      provider: test_provider
      params:
        enable_motion:
          type: bool
          default: false
"""


@pytest.fixture
def catalog(tmp_path):
    path = tmp_path / "capabilities.yaml"
    path.write_text(CATALOG_YAML)
    return CapabilityCatalog.from_file(path)


class TestValidate:
    def test_valid_float_in_range(self, catalog):
        validated, warnings = catalog.validate("test_provider", "test-model-float", {"temperature": 1.0})
        assert validated["temperature"] == 1.0
        assert warnings == []

    def test_valid_str_in_options(self, catalog):
        validated, warnings = catalog.validate("test_provider", "test-model-str", {"style": "anime"})
        assert validated["style"] == "anime"
        assert warnings == []

    def test_unknown_param_returns_warning(self, catalog):
        _, warnings = catalog.validate("test_provider", "test-model-float", {"unknown_param": 42})
        assert len(warnings) == 1
        assert "unknown_param" in warnings[0]

    def test_float_out_of_range_raises(self, catalog):
        with pytest.raises(CapabilityError) as exc_info:
            catalog.validate("test_provider", "test-model-float", {"temperature": 5.0})
        assert "out of range" in str(exc_info.value)
        assert "temperature" in str(exc_info.value)

    def test_str_not_in_options_raises(self, catalog):
        with pytest.raises(CapabilityError) as exc_info:
            catalog.validate("test_provider", "test-model-str", {"style": "cubism"})
        assert "not in allowed options" in str(exc_info.value)
        assert "style" in str(exc_info.value)

    def test_no_schema_returns_params_with_warning(self, catalog):
        validated, warnings = catalog.validate("unknown_provider", "unknown_model", {"foo": "bar"})
        assert warnings == ["No capability schema for unknown_provider/unknown_model"]

    def test_bool_param_passes(self, catalog):
        validated, warnings = catalog.validate("test_provider", "test-model-bool", {"enable_motion": True})
        assert validated["enable_motion"] is True


class TestEnsureCapability:
    def test_fills_in_defaults(self, catalog):
        params, warnings = catalog.ensure_capability({}, "test_provider", "test-model-float")
        assert params["temperature"] == 0.7
        assert params["top_p"] == 0.9
        assert warnings == []

    def test_user_params_override_defaults(self, catalog):
        params, warnings = catalog.ensure_capability({"temperature": 1.5}, "test_provider", "test-model-float")
        assert params["temperature"] == 1.5
        assert params["top_p"] == 0.9

    def test_out_of_range_still_raises(self, catalog):
        with pytest.raises(CapabilityError):
            catalog.ensure_capability({"temperature": 99.0}, "test_provider", "test-model-float")

    def test_invalid_option_still_raises(self, catalog):
        with pytest.raises(CapabilityError):
            catalog.ensure_capability({"style": "cubism"}, "test_provider", "test-model-str")

    def test_mixed_valid_user_params_with_defaults(self, catalog):
        params, warnings = catalog.ensure_capability(
            {"temperature": 1.0}, "test_provider", "test-model-float"
        )
        assert params["temperature"] == 1.0
        assert params["top_p"] == 0.9
        assert warnings == []


class TestGetDefaults:
    def test_returns_all_defaults(self, catalog):
        defaults = catalog.get_defaults("test_provider", "test-model-float")
        assert defaults == {"temperature": 0.7, "top_p": 0.9}

    def test_empty_dict_for_unknown_model(self, catalog):
        defaults = catalog.get_defaults("unknown", "unknown")
        assert defaults == {}

    def test_partial_params_only_returns_existing_defaults(self, catalog):
        defaults = catalog.get_defaults("test_provider", "test-model-str")
        assert defaults == {"style": "realistic"}