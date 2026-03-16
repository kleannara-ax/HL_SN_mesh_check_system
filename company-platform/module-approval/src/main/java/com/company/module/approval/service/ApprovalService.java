package com.company.module.approval.service;

import com.company.exception.BusinessException;
import com.company.module.approval.dto.*;
import com.company.module.approval.entity.ApprovalDocument;
import com.company.module.approval.entity.ApprovalHistory;
import com.company.module.approval.entity.ApprovalHistory.ApprovalAction;
import com.company.module.approval.entity.ApprovalStatus;
import com.company.module.approval.repository.ApprovalDocumentRepository;
import com.company.module.approval.repository.ApprovalHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final ApprovalDocumentRepository documentRepository;
    private final ApprovalHistoryRepository historyRepository;

    /**
     * 결재 문서 생성 (초안)
     */
    @Transactional
    public ApprovalDocumentResponse createDocument(ApprovalCreateRequest request) {
        log.info("[결재] 문서 생성 요청 - 요청자: {}, 제목: {}", request.getRequesterId(), request.getTitle());

        ApprovalDocument document = ApprovalDocument.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .requesterId(request.getRequesterId())
                .status(ApprovalStatus.DRAFT)
                .build();

        ApprovalDocument saved = documentRepository.save(document);

        // 이력 기록
        historyRepository.save(ApprovalHistory.builder()
                .documentId(saved.getDocumentId())
                .actorId(request.getRequesterId())
                .action(ApprovalAction.CREATED)
                .comment("문서 생성")
                .build());

        log.info("[결재] 문서 생성 완료 - ID: {}", saved.getDocumentId());
        return ApprovalDocumentResponse.from(saved);
    }

    /**
     * 결재 문서 단건 조회
     */
    @Transactional(readOnly = true)
    public ApprovalDocumentResponse getDocument(Long documentId) {
        ApprovalDocument document = findDocumentOrThrow(documentId);
        return ApprovalDocumentResponse.from(document);
    }

    /**
     * 요청자별 결재 문서 목록 조회
     */
    @Transactional(readOnly = true)
    public Page<ApprovalDocumentResponse> getDocumentsByRequester(String requesterId, Pageable pageable) {
        return documentRepository.findByRequesterId(requesterId, pageable)
                .map(ApprovalDocumentResponse::from);
    }

    /**
     * 결재 대기함 조회 (결재자 기준)
     */
    @Transactional(readOnly = true)
    public Page<ApprovalDocumentResponse> getPendingDocuments(String approverId, Pageable pageable) {
        return documentRepository.findByApproverIdAndStatus(approverId, ApprovalStatus.PENDING, pageable)
                .map(ApprovalDocumentResponse::from);
    }

    /**
     * 결재 요청 (DRAFT -> PENDING)
     */
    @Transactional
    public ApprovalDocumentResponse submitDocument(Long documentId, ApprovalSubmitRequest request) {
        log.info("[결재] 결재 요청 - 문서ID: {}, 결재자: {}", documentId, request.getApproverId());

        ApprovalDocument document = findDocumentOrThrow(documentId);
        document.submitForApproval(request.getApproverId());

        // 이력 기록
        historyRepository.save(ApprovalHistory.builder()
                .documentId(documentId)
                .actorId(document.getRequesterId())
                .action(ApprovalAction.SUBMITTED)
                .comment("결재 요청 - 결재자: " + request.getApproverId())
                .build());

        log.info("[결재] 결재 요청 완료 - 문서ID: {}", documentId);
        return ApprovalDocumentResponse.from(document);
    }

    /**
     * 결재 승인 (PENDING -> APPROVED)
     */
    @Transactional
    public ApprovalDocumentResponse approveDocument(Long documentId, ApprovalActionRequest request) {
        log.info("[결재] 승인 처리 - 문서ID: {}, 처리자: {}", documentId, request.getActorId());

        ApprovalDocument document = findDocumentOrThrow(documentId);
        validateApprover(document, request.getActorId());
        document.approve();

        // 이력 기록
        historyRepository.save(ApprovalHistory.builder()
                .documentId(documentId)
                .actorId(request.getActorId())
                .action(ApprovalAction.APPROVED)
                .comment(request.getComment())
                .build());

        log.info("[결재] 승인 완료 - 문서ID: {}", documentId);
        return ApprovalDocumentResponse.from(document);
    }

    /**
     * 결재 반려 (PENDING -> REJECTED)
     */
    @Transactional
    public ApprovalDocumentResponse rejectDocument(Long documentId, ApprovalActionRequest request) {
        log.info("[결재] 반려 처리 - 문서ID: {}, 처리자: {}", documentId, request.getActorId());

        if (request.getComment() == null || request.getComment().isBlank()) {
            throw new BusinessException("APPROVAL_REJECT_REASON_REQUIRED", "반려 시 사유는 필수 입력 항목입니다.");
        }

        ApprovalDocument document = findDocumentOrThrow(documentId);
        validateApprover(document, request.getActorId());
        document.reject(request.getComment());

        // 이력 기록
        historyRepository.save(ApprovalHistory.builder()
                .documentId(documentId)
                .actorId(request.getActorId())
                .action(ApprovalAction.REJECTED)
                .comment(request.getComment())
                .build());

        log.info("[결재] 반려 완료 - 문서ID: {}", documentId);
        return ApprovalDocumentResponse.from(document);
    }

    /**
     * 결재 이력 조회
     */
    @Transactional(readOnly = true)
    public List<ApprovalHistoryResponse> getDocumentHistory(Long documentId) {
        // 문서 존재 여부 확인
        findDocumentOrThrow(documentId);

        return historyRepository.findByDocumentIdOrderByCreatedAtDesc(documentId)
                .stream()
                .map(ApprovalHistoryResponse::from)
                .toList();
    }

    // === Private Helper ===

    private ApprovalDocument findDocumentOrThrow(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException(
                        "APPROVAL_DOCUMENT_NOT_FOUND",
                        "결재 문서를 찾을 수 없습니다. ID: " + documentId,
                        404
                ));
    }

    private void validateApprover(ApprovalDocument document, String actorId) {
        if (!actorId.equals(document.getApproverId())) {
            throw new BusinessException(
                    "APPROVAL_UNAUTHORIZED",
                    "해당 문서의 결재 권한이 없습니다. 지정된 결재자: " + document.getApproverId(),
                    403
            );
        }
    }
}
