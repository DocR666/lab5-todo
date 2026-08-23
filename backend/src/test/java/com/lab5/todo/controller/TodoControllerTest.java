package com.lab5.todo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lab5.todo.model.Priority;
import com.lab5.todo.model.Todo;
import com.lab5.todo.repository.TodoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Unit / slice tests for TodoController. No real database is used — the
 * TodoRepository is mocked, so these run without PostgreSQL or Tomcat.
 * Run with: mvn test
 */
@WebMvcTest(TodoController.class)
class TodoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TodoRepository todoRepository;

    private Todo sampleTodo(Long id, String title, Priority priority, LocalDate dueDate) {
        Todo todo = new Todo();
        todo.setId(id);
        todo.setTitle(title);
        todo.setDescription("sample description");
        todo.setCompleted(false);
        todo.setPriority(priority);
        todo.setDueDate(dueDate);
        return todo;
    }

    @Test
    void getAllTodos_returnsList() throws Exception {
        when(todoRepository.findAll()).thenReturn(List.of(
                sampleTodo(1L, "Task A", Priority.LOW, LocalDate.now())
        ));

        mockMvc.perform(get("/api/todos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Task A"));
    }

    @Test
    void getAllTodos_sortByPriority_ordersHighFirst() throws Exception {
        when(todoRepository.findAll()).thenReturn(List.of(
                sampleTodo(1L, "Low task", Priority.LOW, LocalDate.now()),
                sampleTodo(2L, "High task", Priority.HIGH, LocalDate.now())
        ));

        mockMvc.perform(get("/api/todos").param("sort", "priority"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("High task"));
    }

    @Test
    void getTodoById_notFound_returns404() throws Exception {
        when(todoRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/todos/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createTodo_withBlankTitle_returns400() throws Exception {
        Todo invalid = sampleTodo(null, "", Priority.MEDIUM, LocalDate.now());

        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createTodo_valid_returns201() throws Exception {
        Todo toCreate = sampleTodo(null, "New task", Priority.HIGH, LocalDate.now());
        Todo saved = sampleTodo(1L, "New task", Priority.HIGH, LocalDate.now());
        when(todoRepository.save(any(Todo.class))).thenReturn(saved);

        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toCreate)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void updateTodo_missing_returns404() throws Exception {
        when(todoRepository.findById(anyLong())).thenReturn(Optional.empty());
        Todo update = sampleTodo(null, "Updated", Priority.LOW, LocalDate.now());

        mockMvc.perform(put("/api/todos/42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteTodo_existing_returns204() throws Exception {
        Todo existing = sampleTodo(5L, "To delete", Priority.MEDIUM, LocalDate.now());
        when(todoRepository.findById(5L)).thenReturn(Optional.of(existing));

        mockMvc.perform(delete("/api/todos/5"))
                .andExpect(status().isNoContent());

        verify(todoRepository).delete(existing);
    }
}
