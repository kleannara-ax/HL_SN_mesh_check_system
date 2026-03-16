package com.company.module.approval.controller;

import com.company.module.approval.dto.*;
import com.company.module.approval.service.ApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 결재 모듈 REST API Controller
 * URL Prefix: /approval-api/**
 */
@Slf4j
@RestController
@RequestMapping("/approval-api")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvalService;

    /**
     * 결재 문서 생성 (초안)
     * POST /approval-api/documents
     */
    @PostMapping("/documents")
    public ResponseEntity<ApprovalDocumentResponse> createDocument(
            @Valid @RequestBody ApprovalCreateRequest request) {

        ApprovalDocumentResponse response = approvalService.createDocument(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 결재 문서 단건 조회
     * GET /approval-api/documents/{documentId}
     */
    @GetMapping("/documents/{documentId}")
    public ResponseEntity<ApprovalDocumentResponse> getDocument(
            @PathVariable Long documentId) {

        ApprovalDocumentResponse response = approvalService.getDocument(documentId);
        return ResponseEntity.ok(response);
    }

    /**
     * 요청자별 결재 문서 목록 조회
     * GET /approval-api/documents?requesterId=xxx
     */
    @GetMapping("/documents")
    public ResponseEntity<Page<ApprovalDocumentResponse>> getDocuments(
            @RequestParam String requesterId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ApprovalDocumentResponse> response = approvalService.getDocumentsByRequester(requesterId, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * 결재 대기함 조회 (결재자 기준)
     * GET /approval-api/pending?approverId=xxx
     */
    @GetMapping("/pending")
    public ResponseEntity<Page<ApprovalDocumentResponse>> getPendingDocuments(
            @RequestParam String approverId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ApprovalDocumentResponse> response = approvalService.getPendingDocuments(approverId, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * 결재 요청 (DRAFT -> PENDING)
     * POST /approval-api/documents/{documentId}/submit
     */
    @PostMapping("/documents/{documentId}/submit")
    public ResponseEntity<ApprovalDocumentResponse> submitDocument(
            @PathVariable Long documentId,
            @Valid @RequestBody ApprovalSubmitRequest request) {

        ApprovalDocumentResponse response = approvalService.submitDocument(documentId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결재 승인 (PENDING -> APPROVED)
     * POST /approval-api/documents/{documentId}/approve
     */
    @PostMapping("/documents/{documentId}/approve")
    public ResponseEntity<ApprovalDocumentResponse> approveDocument(
            @PathVariable Long documentId,
            @Valid @RequestBody ApprovalActionRequest request) {

        ApprovalDocumentResponse response = approvalService.approveDocument(documentId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결재 반려 (PENDING -> REJECTED)
     * POST /approval-api/documents/{documentId}/reject
     */
    @PostMapping("/documents/{documentId}/reject")
    public ResponseEntity<ApprovalDocumentResponse> rejectDocument(
            @PathVariable Long documentId,
            @Valid @RequestBody ApprovalActionRequest request) {

        ApprovalDocumentResponse response = approvalService.rejectDocument(documentId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결재 이력 조회
     * GET /approval-api/documents/{documentId}/history
     */
    @GetMapping("/documents/{documentId}/history")
    public ResponseEntity<List<ApprovalHistoryResponse>> getDocumentHistory(
            @PathVariable Long documentId) {

        List<ApprovalHistoryResponse> response = approvalService.getDocumentHistory(documentId);
        return ResponseEntity.ok(response);
    }
}
