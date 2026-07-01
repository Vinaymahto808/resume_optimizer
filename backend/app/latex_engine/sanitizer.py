def escape_latex(text: str) -> str:
    if not text:
        return ""
    chars = {
        "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#",
        "_": "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}",
        "^": "\\textasciicircum{}",
    }
    result = ""
    for ch in text:
        result += chars.get(ch, ch)
    return result
