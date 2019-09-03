Tool to start working out differences in the type information provided by @types/react-native vs the type information provided by the built in flow types.

This is used in combination with another project which will generate a similar lightweight type def file from the flow types. Then the two files can be diffed.

-- Currently only generates type info from Components properties interfaces.
