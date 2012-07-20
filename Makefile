MOCHA_OPTS=
REPORTER = dot

test: test-unit

test-unit:
	@./node_modules/.bin/mocha \
			--reporter $(REPORTER)
