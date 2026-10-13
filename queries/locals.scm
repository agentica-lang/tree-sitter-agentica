; Scopes

[
  (function_definition)
  (block)
  (if)
  (elsif)
  (else)
  (while)
  (for)
  (case_arm)
] @local.scope

; Definitions

(parameter
  name: (identifier) @local.definition.parameter)

(block_parameter
  name: (identifier) @local.definition.parameter)

(assignment
  left: (identifier) @local.definition.var)

(for
  variable: (identifier) @local.definition.var)

(pattern_bindings
  (identifier) @local.definition.var)

; References

(identifier) @local.reference
