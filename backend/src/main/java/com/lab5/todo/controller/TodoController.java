package com.lab5.todo.controller;

import com.lab5.todo.model.Todo;
import com.lab5.todo.repository.TodoRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoRepository todoRepository;

    public TodoController(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    @GetMapping
    public List<Todo> getAllTodos(@RequestParam(required = false) String sort) {
        List<Todo> todos = new ArrayList<>(todoRepository.findAll());
        if ("dueDate".equalsIgnoreCase(sort)) {
            todos.sort(Comparator.comparing(Todo::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));
        } else if ("priority".equalsIgnoreCase(sort)) {
            todos.sort(Comparator.comparing((Todo t) -> t.getPriority().ordinal()).reversed());
        }
        return todos;
    }

    @GetMapping("/{id}")
    public Todo getTodoById(@PathVariable Long id) {
        return findTodoOrThrow(id);
    }

    @PostMapping
    public ResponseEntity<Todo> createTodo(@Valid @RequestBody Todo todo) {
        todo.setId(null);
        Todo saved = todoRepository.save(todo);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public Todo updateTodo(@PathVariable Long id, @Valid @RequestBody Todo update) {
        Todo existing = findTodoOrThrow(id);
        existing.setTitle(update.getTitle());
        existing.setDescription(update.getDescription());
        existing.setCompleted(update.getCompleted());
        existing.setPriority(update.getPriority());
        existing.setDueDate(update.getDueDate());
        return todoRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable Long id) {
        Todo existing = findTodoOrThrow(id);
        todoRepository.delete(existing);
        return ResponseEntity.noContent().build();
    }

    private Todo findTodoOrThrow(Long id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found with id " + id));
    }
}
