# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class TestMinimal(gl.Contract):
    counter: u32

    def __init__(self):
        self.counter = u32(0)

    @gl.public.view
    def get_counter(self) -> u32:
        return self.counter

    @gl.public.write
    def increment(self):
        self.counter = u32(self.counter + u32(1))
