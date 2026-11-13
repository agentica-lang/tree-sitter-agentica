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
#    ^ type
  data: Bytes
# ^ property
#       ^ type
  note: Optional[String]
# ^ property
#       ^ type
  tags: Set[String]
# ^ property
#       ^ type
  owner: TaskRef
#        ^ type
  codec: Codec
#        ^ type
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
#                                   ^ type
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
#           ^ type
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
#         ^ type
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
  def close(fd: C.Int32) -> C.Int32
#     ^ function
#           ^ variable.parameter
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
#                       ^ type
end

extern module "stats"
# <- keyword
#      ^ keyword
  resource Db
#          ^ type.definition
  compute def scan(db: Db) -> List[Int]
#             ^ function
#                  ^ variable.parameter
  def empty?(db: Db) -> Bool
end

export Util.helper
# <- keyword
#      ^ module
#           ^ function

def scale(x: Int) -> Int = x * 2
# <- keyword
#   ^ function

def families(d: OpenSSL.Digest, r: HTTP.Response) -> Void
#               ^ type
#                       ^ type
#                                  ^ type
#                                       ^ type
  req = HTTP.Request(url: "x")
#       ^ type
#            ^ type
  event = Logger.Event(message: "x")
#         ^ type
#                ^ type
  s = HTTP.Stream(x)
#     ^ type
#          ^ type
  e = Event.Level
#     ^ type
#           ^ type
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
  while true
    break # done
#   ^ keyword.repeat
    next  # again
#   ^ keyword.repeat
  end
end

struct Conn
  host: String

  private
# ^ keyword

  private: Int
# ^ property
end

module Counter
  def start(n: Int) -> Int = step(n, by: 1)
#                                    ^ property

  private
# ^ keyword

  def step(n: Int, by: Int) -> Int = n + by
end

private # the rest of the file
# <- keyword

def private() -> Int = 1
#   ^ function
