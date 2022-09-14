from __future__ import annotations

from dataclasses import dataclass

from iso639 import languages


@dataclass
class LanguageCode:
    name: str
    iso1_code: str
    iso3_code: str


_additional_language_codes: list[LanguageCode] = [
    LanguageCode("Other", "other", "other"),  # for languages not in ISO396
    LanguageCode("None", "none", "none"),  # for other modalities
]


def get_language_codes():
    """getter for language codes data"""
    language_codes = []
    for lang in list(languages):
        if len(lang.part3) > 0:
            language_codes.append(LanguageCode(lang.name, lang.part1, lang.part3))
        else:
            language_codes.append(
                LanguageCode(lang.name, lang.part1, "unkown")
            )  # some languages don't have iso369-3 code, use "unknown"
    language_codes.sort(key=lambda x: (x.iso3_code, x.name))
    language_codes += _additional_language_codes
    return language_codes
