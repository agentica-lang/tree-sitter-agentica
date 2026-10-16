import Models from "models"
# <- keyword
#             ^ keyword
#      ^ module

LIMIT = 10
# ^ constant

type UserId = Int
# <- keyword
#    ^ type.definition

struct Point
# <- keyword
#      ^ type.definition
  x: Int
# ^ property
#    ^ type.builtin
end

enum Shape
#    ^ type.definition
  Circle(Float)
# ^ constant
end

def area(shape: Shape, p: Point) -> Float
# <- keyword
#   ^ function
#        ^ variable.parameter
#               ^ type
#                                   ^ type.builtin
  total = p.x + 1
# ^ variable
#           ^ property
#             ^ operator
#               ^ number
  label = "n: #{total}"
#         ^ string
#               ^ variable
#             ^ punctuation.special
#                    ^ punctuation.special
  xs = [1].map do |item| item * 2 end
#          ^ function.method.call
#                  ^ variable.parameter
  puts(label)
# ^ function.call
  IO.puts(label)
# ^ module
#    ^ function.call
  c = Shape.Circle(1.0)
#           ^ constant
  f = &area
#      ^ function
  case shape
# ^ keyword.conditional
    Shape.Circle(r) -> return r
#   ^ type
#         ^ constant
#                      ^ keyword.return
    ok(v) -> return 1.5
#   ^ function.builtin
#                   ^ number.float
    _ -> return nil
#   ^ variable.builtin
#               ^ constant.builtin
  end
end
