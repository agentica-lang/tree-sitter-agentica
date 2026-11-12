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
  data: Bytes
# ^ property
#       ^ type.builtin
  note: Optional[String]
# ^ property
#       ^ type.builtin
  tags: Set[String]
# ^ property
#       ^ type.builtin
  owner: TaskRef
#        ^ type.builtin
  codec: Codec
#        ^ type.builtin
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
  found = some(none)
#         ^ function.call
#              ^ constant.builtin
  missing = none
#           ^ constant.builtin
  IO.puts(label)
# ^ module
#    ^ function.call
  root = Math.sqrt(2.0)
#        ^ module
#             ^ function.call
  c = Shape.Circle(1.0)
#           ^ constant
  f = &area
#      ^ function
  word = /\w+\/x/i
#        ^ string.regexp
#          ^ string.escape
#                ^ character.special
  half = total / 2
#              ^ operator
  case shape
# ^ keyword.conditional
    Shape.Circle(r) -> return r
#   ^ type
#         ^ constant
#                      ^ keyword.return
    ok(v) -> return 1.5
#   ^ function.builtin
#                   ^ number.float
    some(v) -> return v
#   ^ function.builtin
    none -> return nil
#   ^ constant.builtin
    _ -> return nil
#   ^ variable.builtin
#               ^ constant.builtin
  end
end

def usage(name: String, width: Int = 80) -> String
#                                    ^ number
  return <<~TEXT
#        ^ string
    Usage: #{name}
#   ^ string
#          ^ punctuation.special
    Width: 1_000
  TEXT
# ^ string
end


extern "libc"
# <- keyword
  export def close(fd: C.Int32) -> C.Int32
#            ^ function
#                  ^ variable.parameter
  callback Visit(item: C.Pointer) -> Void
# ^ keyword
#          ^ type.definition
end

extern "libpq"
  resource Conn, free: PQfinish
#                      ^ function
  resource Db, free_ref: duckdb_close
#                        ^ function
  resource Thing, free: C.Function
#                       ^ type.builtin
end

extern module "stats"
# <- keyword
#      ^ keyword
  resource Db
#          ^ type.definition
  compute def scan(db: Db) -> List[Int]
#             ^ function
#                  ^ variable.parameter
  export def empty?(db: Db) -> Bool
end

export Util.helper
# <- keyword
#      ^ module
#           ^ function

def scale(x: Int) -> Int = x * 2
# <- keyword
#   ^ function

def families(d: OpenSSL.Digest, r: HTTP.Response) -> Void
#               ^ type.builtin
#                       ^ type.builtin
#                                  ^ type.builtin
#                                       ^ type.builtin
  req = HTTP.Request(url: "x")
#       ^ type.builtin
#            ^ type.builtin
  event = Logger.Event(message: "x")
#         ^ type.builtin
#                ^ type.builtin
  s = HTTP.Stream(x)
#     ^ type.builtin
#          ^ type.builtin
  e = Event.Level
#     ^ type
#           ^ constant
  r = HttpWire.get(url)
#     ^ module
#              ^ function.call
  l = Logger.info("x")
#     ^ module
#            ^ function.call
  twice = ->(n: Int) { n * 2 }
#         ^ operator
#            ^ variable.parameter
  names = xs |> map(->(n) { n.to_s }) |> join(", ")
#               ^ function.call
#                                        ^ function.call
  xs.each { |x| puts(x) }
#    ^ function.method.call
#            ^ variable.parameter
  run do
# ^ function.call
    puts("a")
  end
  return x if x > 1
# ^ keyword.return
#          ^ keyword.conditional
end
