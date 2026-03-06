import { tokenize } from "./tokenizer"
import { type ChainedCall, type MongoshAST, ParseError, type Token } from "./types"

const ALLOWED_METHODS = new Set([
	"find",
	"findOne",
	"countDocuments",
	"insertOne",
	"insertMany",
	"updateOne",
	"updateMany",
	"deleteOne",
	"deleteMany",
])

const ALLOWED_CHAIN_METHODS = new Set(["sort", "limit", "skip", "projection", "project"])

export function parse(input: string): MongoshAST {
	const tokens = tokenize(input)
	let pos = 0

	function current(): Token {
		return tokens[pos]
	}

	function expect(type: Token["type"], value?: string): Token {
		const tok = current()
		if (tok.type !== type || (value !== undefined && tok.value !== value)) {
			throw new ParseError(
				`Expected ${value ? `'${value}'` : type} but got '${tok.value}'`,
				tok.position,
				input,
			)
		}
		pos++
		return tok
	}

	function parseValue(): unknown {
		const tok = current()

		if (tok.type === "STRING") {
			pos++
			return tok.value
		}

		if (tok.type === "NUMBER") {
			pos++
			return tok.value.includes(".") ? Number.parseFloat(tok.value) : Number.parseInt(tok.value, 10)
		}

		if (tok.type === "BOOLEAN") {
			pos++
			return tok.value === "true"
		}

		if (tok.type === "NULL") {
			pos++
			return null
		}

		if (tok.type === "LBRACE") {
			return parseObject()
		}

		if (tok.type === "LBRACKET") {
			return parseArray()
		}

		// Handle special constructors like ObjectId("..."), ISODate("...")
		if (tok.type === "IDENTIFIER" && ["ObjectId", "ISODate", "NumberInt"].includes(tok.value)) {
			const constructorName = tok.value
			pos++
			expect("LPAREN")
			let arg: unknown
			if (current().type !== "RPAREN") {
				arg = parseValue()
			}
			expect("RPAREN")
			return { $constructor: constructorName, value: arg }
		}

		throw new ParseError(
			`Unexpected token '${tok.value}' at position ${tok.position}`,
			tok.position,
			input,
		)
	}

	function parseObject(): Record<string, unknown> {
		expect("LBRACE")
		const obj: Record<string, unknown> = {}

		while (current().type !== "RBRACE") {
			// Key: identifier or string
			let key: string
			if (current().type === "IDENTIFIER") {
				key = current().value
				pos++
			} else if (current().type === "STRING") {
				key = current().value
				pos++
			} else {
				throw new ParseError(
					`Expected object key but got '${current().value}'`,
					current().position,
					input,
				)
			}

			expect("COLON")
			obj[key] = parseValue()

			// Optional comma (trailing comma allowed)
			if (current().type === "COMMA") {
				pos++
			}
		}

		expect("RBRACE")
		return obj
	}

	function parseArray(): unknown[] {
		expect("LBRACKET")
		const arr: unknown[] = []

		while (current().type !== "RBRACKET") {
			arr.push(parseValue())
			if (current().type === "COMMA") {
				pos++
			}
		}

		expect("RBRACKET")
		return arr
	}

	function parseArgs(): unknown[] {
		expect("LPAREN")
		const args: unknown[] = []

		while (current().type !== "RPAREN") {
			args.push(parseValue())
			if (current().type === "COMMA") {
				pos++
			}
		}

		expect("RPAREN")
		return args
	}

	// Parse: db.<collection>.<method>(<args>)
	expect("IDENTIFIER", "db")
	expect("DOT")
	const collection = expect("IDENTIFIER").value
	expect("DOT")
	const method = expect("IDENTIFIER").value

	if (!ALLOWED_METHODS.has(method)) {
		throw new ParseError(
			`The method '${method}' is not allowed in challenges. Allowed: ${[...ALLOWED_METHODS].join(", ")}`,
			tokens[pos - 1].position,
			input,
		)
	}

	const args = parseArgs()

	// Parse chained methods
	const chain: ChainedCall[] = []
	while (current().type === "DOT") {
		pos++ // skip dot
		const chainMethod = expect("IDENTIFIER").value
		if (!ALLOWED_CHAIN_METHODS.has(chainMethod)) {
			throw new ParseError(
				`The chain method '${chainMethod}' is not allowed. Allowed: ${[...ALLOWED_CHAIN_METHODS].join(", ")}`,
				tokens[pos - 1].position,
				input,
			)
		}
		const chainArgs = parseArgs()
		chain.push({ method: chainMethod, args: chainArgs })
	}

	return { collection, method, args, chain }
}
