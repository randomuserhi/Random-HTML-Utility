{
	let RHU = window.RHU;
	if (RHU === null || RHU === undefined) throw new Error("RHU library could not be found. Did you import it prior testing?");
	
	let group = function(name, tests)
	{
		let results = [];
		let allPassed = true;
		for (let test of tests)
		{
			let messages = [];
			let consoleGroup = console.group;
			let consoleGroupCollapsed = console.groupCollapsed;
			let consoleGroupEnd = console.groupEnd;
			let consoleLog = console.log;
			let consoleError = console.error;
			let consoleWarn = console.warn;
			console.group = function(...args)
			{
				messages.push({
					type: "group",
					args: args
				})
			};
			console.groupCollapsed = function(...args)
			{
				messages.push({
					type: "groupCollapsed",
					args: args
				})
			};
			console.groupEnd = function(...args)
			{
				messages.push({
					type: "groupEnd",
					args: args
				})
			};
			console.log = function(...args)
			{
				messages.push({
					type: "log",
					args: args
				})
			};
			console.warn = function(...args)
			{
				messages.push({
					type: "warn",
					args: args
				})
			};
			console.error = function(...args)
			{
				messages.push({
					type: "error",
					args: args
				})
			};

			let value = {
				status: "ok",
				result: undefined
			};
			try
			{
				value.result = {
					result: undefined,
					detail: {}
				};
                Object.assign(value.result, test.test());
			}
			catch(e)
			{
				value.status = "error";
				value.result = e;
			}

			let result = {
				name: test.name || "",
				passed: value.status === "ok" ? test.expected(value.result.result, value.result.detail) : false,
				value: value,
				messages: messages
			};
			if (!result.passed) allPassed = false;
			results.push(result);

			console.group = consoleGroup;
			console.groupCollapsed = consoleGroupCollapsed;
			console.groupEnd = consoleGroupEnd;
			console.log = consoleLog;
			console.error = consoleError;
			console.warn = consoleWarn;
		}

		if (allPassed) console.groupCollapsed(`\u2713 ${name}`);
		else console.groupCollapsed(`\u00D7 ${name}`);

		for (let i = 0, result = results[i]; i < results.length; result = results[++i])
		{
			if (result.passed)
				console.log(`\u2713 (Test ${i + 1}) ${result.name}`);
			else
			{
				console.groupCollapsed(`\u00D7 (Test ${i + 1}) ${result.name}`);
				if (result.messages.length > 0)
				{
					console.group("Log:");
					for (let message of result.messages)
						console[message.type](...message.args);
					console.groupEnd();
				}
				console.log(`(status '${result.value.status}'):`);
				if (result.value.status === "ok") console.log(result.value.result.result);
				else console.error(result.value.result.result);
				console.groupEnd();
			}
		}

		console.groupEnd();
	}
	RHU.module({ module: "tests/rhu", hard: [] }, function(e)
	{
		group("RHU.exists", [
			{
				name: "null value",
				test: function() 
				{ 
					let value = null;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === false; 
				}
			},
			{
				name: "undefined value",
				test: function() 
				{ 
					let value = undefined;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === false; 
				}
			},
			{
				name: "no value",
				test: function() 
				{ 
					let value;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === false; 
				}
			},
			{
				name: "true",
				test: function() 
				{ 
					let value = true;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === true; 
				}
			},
			{
				name: "false",
				test: function() 
				{ 
					let value = false;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === true; 
				}
			},
			{
				name: "1",
				test: function() 
				{ 
					let value = 1;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === true; 
				}
			},
			{
				name: "0",
				test: function() 
				{ 
					let value = 0;
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === true; 
				}
			},
			{
				name: "{}",
				test: function() 
				{ 
					let value = {};
					return { result: RHU.exists(value) };
				},
				expected: function(result) 
				{
					return result === true; 
				}
			}
		]);

		// TODO(randomuserhi): Need to test getters, setters, symbols, enumerable, configurable etc...
		{
			function identical(a, b)
			{
				for (let key in a)
				{
					if (a[key] !== b[key]) return false;
				}
				for (let key in b)
				{
					if (a[key] !== b[key]) return false;
				}
				return true;
			}

			group("RHU.properties", [
				{
					name: "Basic properties with null and undefined",
					test: function()
					{
						let obj = {
							prop1: 1,
							prop2: undefined,
							prop3: null
						};
						return { result: RHU.properties(obj) };
					},
					expected: function(result, detail)
					{
						let obj = {
							prop1: 1,
							prop2: undefined,
							prop3: null
						};

						for (key in obj)
						{
							if (!result.has(key)) return false;
							if (!identical(result.get(key), Object.getOwnPropertyDescriptor(obj, key))) return false;
						}
						for (key in Object)
						{
							if (!result.has(key)) return false;
							if (!identical(result.get(key), Object.getOwnPropertyDescriptor(obj, key))) return false;
						}
						return true;
					}
				},
				{
					name: "Prototype",
					test: function()
					{
						let proto = {
							prop3: "voodoo",
							prop4: "woah"
						}
						let obj = {
							prop1: 1,
							prop2: undefined,
							prop3: null
						}
						Object.setPrototypeOf(obj, proto);
						return { result: RHU.properties(obj) };
					},
					expected: function(result)
					{
						let obj = {
							prop1: 1,
							prop2: undefined,
							prop3: null,
							prop4: "woah"
						};

						for (key in obj)
						{
							if (!result.has(key)) return false;
							if (!identical(result.get(key), Object.getOwnPropertyDescriptor(obj, key))) return false;
						}
						for (key in Object)
						{
							if (!result.has(key)) return false;
							if (!identical(result.get(key), Object.getOwnPropertyDescriptor(obj, key))) return false;
						}
						return true;
					}
				},
				{
					name: "hasOwnProperty",
					test: function()
					{
						let proto = {
							prop3: "voodoo",
							prop4: "woah"
						}
						let obj = {
							prop1: 1,
							prop2: undefined,
							prop3: null
						}
						Object.setPrototypeOf(obj, proto);
						return { result: RHU.properties(obj, { hasOwn: true }) };
					},
					expected: function(result)
					{
						let obj = {
							prop1: 1,
							prop2: undefined,
							prop3: null
						};

						if (result.size !== 3) return false;
						for (key in obj)
						{
							if (!result.has(key)) return false;
							if (!identical(result.get(key), Object.getOwnPropertyDescriptor(obj, key))) return false;
						}
						return true;
					}
				}
			]);
		}

		// TODO(randomuserhi): Add tests for the other core RHU functions
	});
}