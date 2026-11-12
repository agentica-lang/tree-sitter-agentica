(function_definition
  name: (identifier) @name) @definition.function

(extern_function_definition
  name: (identifier) @name) @definition.function

(callback_definition
  name: (type_identifier) @name) @definition.class

(resource_definition
  name: (type_identifier) @name) @definition.class

(module_resource_definition
  name: (type_identifier) @name) @definition.class

(struct_definition
  name: (type_identifier) @name) @definition.class

(enum_definition
  name: (type_identifier) @name) @definition.class

(type_alias_definition
  name: (type_identifier) @name) @definition.class

(enum_variant
  name: (type_identifier) @name) @definition.constant

(field_declaration
  name: (identifier) @name) @definition.field

(module_block
  name: (type_identifier) @name) @definition.module

(import
  alias: (type_identifier) @name) @definition.module

(constant_definition
  name: (type_identifier) @name) @definition.constant

(call
  function: (identifier) @name) @reference.call

(method_call
  method: (identifier) @name) @reference.call

(function_reference
  name: (identifier) @name) @reference.call

(construct
  type: (type_identifier) @name) @reference.class
