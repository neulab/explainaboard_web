from __future__ import annotations

from iso639 import languages

from explainaboard_web.models.language_code import LanguageCode

_additional_language_codes: list[LanguageCode] = [
    LanguageCode("Other", "other", "other"),  # for languages not in ISO396
    LanguageCode("None", "none", "none"),  # for other modalities
]


def get_language_codes():
    """getter for language codes data"""
    language_codes = [
        LanguageCode(lang.name, lang.part3, lang.part1)
        for lang in list(languages)
        if len(lang.part3) > 0
    ]
    language_codes.sort(key=lambda x: (x.iso3_code, x.name))
    language_codes += _additional_language_codes
    return language_codes
