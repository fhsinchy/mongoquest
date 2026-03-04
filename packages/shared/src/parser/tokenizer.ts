import { type Token, type TokenType, ParseError } from "./types"

export function tokenize(input: string): Token[] {
	const tokens: Token[] = []
	let i = 0

	while (i < input.length) {
		// Skip whitespace
		if (/\s/.test(input[i])) {
			i++
			continue
		}

		const char = input[i]

		// Single-char tokens
		const singleCharTokens: Record<string, TokenType> = {
			".": "DOT",
			"(": "LPAREN",
			")": "RPAREN",
			"{": "LBRACE",
			"}": "RBRACE",
			"[": "LBRACKET",
			"]": "RBRACKET",
			":": "COLON",
			",": "COMMA",
		}

		if (char in singleCharTokens) {
			tokens.push({ type: singleCharTokens[char], value: char, position: i })
			i++
			continue
		}

		// Strings (double or single quoted)
		if (char === '"' || char === "'") {
			const quote = char
			const start = i
			i++ // skip opening quote
			let value = ""
			while (i < input.length && input[i] !== quote) {
				if (input[i] === "\\") {
					i++ // skip backslash
					if (i < input.length) {
						value += input[i]
					}
				} else {
					value += input[i]
				}
				i++
			}
			if (i >= input.length) {
				throw new ParseError(`Unterminated string starting at position ${start}`, start, input)
			}
			i++ // skip closing quote
			tokens.push({ type: "STRING", value, position: start })
			continue
		}

		// Numbers (including negative: only after colon, comma, lparen, lbracket)
		if (
			/[0-9]/.test(char) ||
			(char === "-" &&
				i + 1 < input.length &&
				/[0-9]/.test(input[i + 1]) &&
				canBeNegativeNumber(tokens))
		) {
			const start = i
			if (char === "-") i++
			while (i < input.length && /[0-9.]/.test(input[i])) {
				i++
			}
			tokens.push({ type: "NUMBER", value: input.slice(start, i), position: start })
			continue
		}

		// Identifiers (including $-prefixed operators and _-prefixed fields)
		if (/[a-zA-Z_$]/.test(char)) {
			const start = i
			while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
				i++
			}
			const value = input.slice(start, i)

			if (value === "true" || value === "false") {
				tokens.push({ type: "BOOLEAN", value, position: start })
			} else if (value === "null") {
				tokens.push({ type: "NULL", value, position: start })
			} else {
				tokens.push({ type: "IDENTIFIER", value, position: start })
			}
			continue
		}

		throw new ParseError(`Unexpected character '${char}' at position ${i}`, i, input)
	}

	tokens.push({ type: "EOF", value: "", position: i })
	return tokens
}

function canBeNegativeNumber(tokens: Token[]): boolean {
	if (tokens.length === 0) return true
	const last = tokens[tokens.length - 1]
	return ["COLON", "COMMA", "LPAREN", "LBRACKET"].includes(last.type)
}
