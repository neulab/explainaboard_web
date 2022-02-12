import React from "react";
interface Props {
  text: string;
  target: "_blank" | "_self" | "_parent" | "_top";
}
/**
 * Renders link in text.
 *   - The regex is not super robust but it should work for most cases. */
export function TextWithLink({ text, target }: Props) {
  function parseStringToShowURL(text: string) {
    const regex = /(https?:\/\/[^\s]+)/g;
    return text.replaceAll(
      regex,
      (url) => `<a href='${url}' target=${target}>${url}</a>`
    );
  }
  return (
    <div dangerouslySetInnerHTML={{ __html: parseStringToShowURL(text) }} />
  );
}
