# **Project Requirements Document: My TypeScript Proxy Server**

The following table outlines the functional requirements of the My TypeScript Proxy Server.

| Requirement ID | Description                      | User Story                                                                                                                           | Expected Behavior/Outcome                                                                                                                                                                                                        |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EN001          | Basic HTTP Request/Response      | As a user, I want to be able to send basic HTTP requests to the proxy server and receive responses.                                           | The system should parse incoming HTTP requests (GET, POST, etc.), execute appropriate logic, and generate valid HTTP responses (status code, headers, body) to return to the client.                                             |
| EN002          | Servlet Container Implementation | As a developer, I want to be able to write application logic similar to servlets and deploy it to the proxy server.                           | The system should provide a container environment capable of loading and executing user-defined code adhering to a specific interface. It should execute the appropriate code based on the request URL and manage its lifecycle. |
| EN003          | Spring Framework Integration     | As a developer, I want to be able to use the developed proxy server as an embedded server for my Spring Framework application.                | The system must be compatible with the standard Servlet API or related interfaces of Spring Boot or Spring Framework. It should be able to load the Spring application context and delegate request handling.                    |
| EN004          | Tomcat Compatibility (Partial)   | As a user, I want to be able to run some features of existing Tomcat-based applications on the proxy server with no or minimal modifications. | The system should implement or provide compatibility for some core Tomcat features (e.g., basic configuration file structure, logging methods) to reduce migration costs. (Specific compatibility scope to be defined later)     |
| EN005          | TypeScript-Based Development     | As a developer, I want to be able to develop and manage the entire project codebase using TypeScript.                                | All system code must be written in TypeScript, leveraging type safety and modern JavaScript features. The compilation and build process must be configured for a TypeScript environment.                                         |

## Checklist

- [ ] EN001: Basic HTTP Request/Response Handling
- [ ] EN002: Servlet Container Feature Implementation
- [ ] EN003: Spring Framework Integration
- [ ] EN004: Tomcat Compatibility (Partial)
- [ ] EN005: TypeScript-Based Development

## Detail

### `src/core/Server.ts` Implementation Plan

1.  **`constructor(port = 8080)`:**
    - Store the listening port number (`this.port`).
    - Initialize the `httpServer` instance to `null`.
2.  **`start()`:**
    - Call `http.createServer((req, res) => { ... })`:
      - Create a Node.js `http.Server` instance and assign it to `this.httpServer`.
      - Register the request handler callback function.
    - **Inside Request Handler Callback (`(req, res) => { ... }`):**
      - Log the request method (`req.method`) and URL (`req.url`) with a timestamp using `console.log` or similar.
      - Set the success status code using `res.statusCode = 200`.
      - Set the response content type header using `res.setHeader('Content-Type', 'text/plain; charset=utf-8')`.
      - Send the response body and end the connection using `res.end('Hello World from My TypeScript Proxy Server!\n')`.
      - _(Comment indication)_ Mark this as the location for future request parsing, routing, and actual handler invocation logic.
    - Call `this.httpServer.on('error', (error) => { ... })`:
      - Register an event listener to handle errors originating from the server itself (e.g., port conflict).
      - Log the error message using `console.error` when an error occurs.
      - _(Comment indication)_ Note that more sophisticated error handling (resource cleanup, restart, etc.) is needed for production.
    - Call `this.httpServer.listen(this.port, () => { ... })`:
      - Start listening for connections on the stored port number (`this.port`).
      - Register a callback function to be executed upon successful listening start.
    - **Inside Listen Callback (`() => { ... }`):**
      - Call `this.httpServer.address()` to get the actual assigned address information (including port).
      - Log the specific port the server is listening on clearly using `console.log`.
3.  **`stop()`:**
    - Use `if (this.httpServer && this.httpServer.listening)` condition:
      - Check if the `httpServer` object exists and is currently listening.
    - Call `this.httpServer.close((error) => { ... })` (if condition is met):
      - Stop the server from accepting new connections and close it completely once all existing connections are finished.
      - Register a callback function to be executed after the server closing operation completes.
    - **Inside Close Callback (`(error) => { ... }`):**
      - Use `if (error)` condition: Check if an error occurred while closing the server.
      - If an error occurred, log it using `console.error` and return.
      - If no error, log the server stop completion message using `console.log('Server stopped.')`.
    - Use `else` block (if condition is not met):
      - Log that the server is not running using `console.log('Server is not running.')`.

### `src/index.ts` Implementation Plan

1.  Create an instance of the `Server` class (using the default port 8080).
2.  Call the `server.start()` method to start the server.
3.  **Graceful Shutdown Handling:**
    - Register listeners for `SIGINT` and `SIGTERM` signals using `process.on(...)`.
    - **Upon receiving a signal:**
      - Log a "Starting server shutdown" message.
      - Call `server.stop()` to stop accepting new requests and attempt to finish existing connections.
      - **(Important)** Wait for `server.stop()` to complete fully (requires asynchronous handling).
      - (If necessary) Perform cleanup for other resources like database connections.
      - Log a "Server shut down completely" message.
      - Call `process.exit(0)` to exit the process normally.
    - (Optional) Implement a timeout for the shutdown process to forcefully exit (`process.exit(1)`) if it takes too long.
