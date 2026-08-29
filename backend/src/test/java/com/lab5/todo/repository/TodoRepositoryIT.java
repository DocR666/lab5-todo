package com.lab5.todo.repository;

import com.lab5.todo.model.Priority;
import com.lab5.todo.model.Todo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test — hits a real, throwaway PostgreSQL container via the
 * real TodoRepository (no mocking). Complements TodoControllerTest's
 * mocked-repository unit tests by proving the JPA mapping and queries
 * actually work against real Postgres, not just against Mockito stubs.
 *
 * Named *IT.java (not *Test.java) so Maven Surefire skips it and Failsafe
 * picks it up instead — run with `mvn verify`, not `mvn test`. Requires a
 * running Docker daemon.
 */
@SpringBootTest
@Testcontainers
class TodoRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TodoRepository todoRepository;

    private Todo newTodo(String title, Priority priority) {
        Todo todo = new Todo();
        todo.setTitle(title);
        todo.setPriority(priority);
        todo.setDueDate(LocalDate.now());
        return todo;
    }

    @Test
    void saveThenFind_persistsToRealDatabase() {
        Todo saved = todoRepository.save(newTodo("Integration test task", Priority.HIGH));

        Optional<Todo> found = todoRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Integration test task");
        assertThat(found.get().getPriority()).isEqualTo(Priority.HIGH);
        assertThat(found.get().getCreatedAt()).isNotNull(); // set by @PrePersist
    }

    @Test
    void updateThenFind_confirmsChangePersisted() {
        Todo saved = todoRepository.save(newTodo("Before update", Priority.LOW));

        saved.setTitle("After update");
        saved.setCompleted(true);
        todoRepository.save(saved);

        Todo reloaded = todoRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getTitle()).isEqualTo("After update");
        assertThat(reloaded.getCompleted()).isTrue();
    }

    @Test
    void deleteThenConfirmGone() {
        Todo saved = todoRepository.save(newTodo("To be deleted", Priority.MEDIUM));
        Long id = saved.getId();

        todoRepository.delete(saved);

        assertThat(todoRepository.findById(id)).isEmpty();
    }
}
