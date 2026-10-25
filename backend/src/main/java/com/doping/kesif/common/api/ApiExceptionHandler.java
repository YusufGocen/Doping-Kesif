package com.doping.kesif.common.api;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler({org.springframework.dao.CannotAcquireLockException.class,
        org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    ResponseEntity<ProblemDetail> concurrencyConflict() {
        ProblemDetail problem=ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"Lobi başka bir işlem tarafından güncellendi; durumunu yenileyin.");
        problem.setProperty("code","CONCURRENT_UPDATE");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> stateConflict() {
        ProblemDetail problem=ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"İstek eşzamanlı bir işlemle veya veri kuralıyla çakıştı.");
        problem.setProperty("code","STATE_CONFLICT");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }
    @ExceptionHandler(KesifApiException.class)
    ResponseEntity<ProblemDetail> kesifProblem(KesifApiException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(exception.getStatus(), exception.getMessage());
        problem.setProperty("code", exception.getCode());
        return ResponseEntity.status(exception.getStatus()).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = body instanceof ProblemDetail pd ? pd : ProblemDetail.forStatus(status);
        problem.setProperty("code", status.is4xxClientError() ? "INVALID_REQUEST" : "INTERNAL_ERROR");
        return super.handleExceptionInternal(ex, problem, headers, status, request);
    }
}
