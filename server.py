import http.server
import socketserver
import os
from http import HTTPStatus

# print('source code for "http.server":', http.server.__file__)


class MyServer(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):

        print(self.path)

        if self.path == "/":
            self.path = os.path.join(os.getcwd(), "index.html")

            print("original  :", self.path)
            print("translated:", self.translate_path(self.path))

            try:
                f = open(self.path, "rb")
            except OSError:
                self.send_error(HTTPStatus.NOT_FOUND, "File not found")
                return None

            ctype = self.guess_type(self.path)
            fs = os.fstat(f.fileno())

            self.send_response(200)
            self.send_header("Content-type", ctype)
            self.send_header("Content-Length", str(fs[6]))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()

            try:
                self.copyfile(f, self.wfile)
            finally:
                f.close()

        else:
            # run normal code
            print("original  :", self.path)
            print("translated:", self.translate_path(self.path))
            super().do_GET()

    def do_POST(self):
        """Save a file following a HTTP PUT request"""
        filename = os.path.basename(self.path)

        file_length = int(self.headers["Content-Length"])
        print("print length: ", file_length)
        # with open(filename, "wb") as output_file:
        #     output_file.write(self.rfile.read(file_length))
        self.send_response(200, "success")
        self.end_headers()
        reply_body = 'Saved "%s"\n' % filename
        self.wfile.write(reply_body.encode("utf-8"))


# --- main ---

handler_object = MyServer

PORT = 8080

print(f"Starting: http://localhost:{PORT}")

try:
    socketserver.TCPServer.allow_reuse_address = (
        True  # solution for `OSError: [Errno 98] Address already in use`
    )
    my_server = socketserver.TCPServer(("", PORT), handler_object)
    my_server.serve_forever()
except KeyboardInterrupt:
    # solution for `OSError: [Errno 98] Address already in use - when stoped by Ctr+C
    print('Stoped by "Ctrl+C"')
finally:
    # solution for `OSError: [Errno 98] Address already in use
    print("Closing")
    my_server.server_close()
