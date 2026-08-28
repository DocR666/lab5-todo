package com.lab5.todo.controller;

import com.lab5.todo.model.Priority;
import com.lab5.todo.model.Todo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * End-to-end integration test: real HTTP calls (via TestRestTemplate) into
 * the real DispatcherServlet/TodoController, into the real TodoRepository,
 * into a real (throwaway) PostgreSQL container. Nothing is mocked here —
 * this is the layer TodoControllerTest's @WebMvcTest slice tests
 * deliberately don't cover.
 *
 * Named *IT.java (not *Test.java) so Maven Surefire skips it and Failsafe
 * picks it up instead — run with `mvn verify`, not `mvn test`. Requires a
 * running Docker daemon.
 */
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class TodoControllerIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    private Todo newTodo(String title, Priority priority) {
        Todo todo = new Todo();
        todo.setTitle(title);
        todo.setPriority(priority);
        todo.setDueDate(LocalDate.now());
        return todo;
    }

    @Test
    void createThenFetchById_realHttpRoundTrip() {
        ResponseEntity<Todo> createResponse =
                restTemplate.postForEntity("/api/todos", newTodo("Create via HTTP", Priority.HIGH), Todo.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long id = createResponse.getBody().getId();
        assertThat(id).isNotNull();

        ResponseEntity<Todo> getResponse = restTemplate.getForEntity("/api/todos/" + id, Todo.class);

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().getTitle()).isEqualTo("Create via HTTP");
    }

    @Test
    void updateThenFetch_confirmsChangeLandedInDatabase() {
        Todo created = restTemplate.postForEntity(
                "/api/todos", newTodo("Before HTTP update", Priority.LOW), Todo.class).getBody();

        Todo update = newTodo("After HTTP update", Priority.HIGH);
        update.setCompleted(true);
        restTemplate.put("/api/todos/" + created.getId(), update);

        ResponseEntity<Todo> getResponse = restTemplate.getForEntity("/api/todos/" + created.getId(), Todo.class);

        assertThat(getResponse.getBody().getTitle()).isEqualTo("After HTTP update");
        assertThat(getResponse.getBody().getCompleted()).isTrue();
    }

    @Test
    void deleteThenFetch_returns404() {
        Todo created = restTemplate.postForEntity(
                "/api/todos", newTodo("To be deleted via HTTP", Priority.MEDIUM), Todo.class).getBody();

        restTemplate.delete("/api/todos/" + created.getId());

        ResponseEntity<Todo> getResponse = restTemplate.getForEntity("/api/todos/" + created.getId(), Todo.class);

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getAll_reflectsRecentlyCreatedTodos() {
        int sizeBefore = restTemplate.getForEntity("/api/todos", Todo[].class).getBody().length;

        restTemplate.postForEntity("/api/todos", newTodo("Bulk task 1", Priority.LOW), Todo.class);
        restTemplate.postForEntity("/api/todos", newTodo("Bulk task 2", Priority.MEDIUM), Todo.class);

        List<Todo> after = List.of(restTemplate.getForEntity("/api/todos", Todo[].class).getBody());

        assertThat(after).hasSize(sizeBefore + 2);
        assertThat(after).extracting(Todo::getTitle).contains("Bulk task 1", "Bulk task 2");
    }
}
