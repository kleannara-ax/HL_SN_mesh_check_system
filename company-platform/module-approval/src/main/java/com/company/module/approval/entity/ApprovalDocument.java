package com.company.module.approval.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 결재 문서 엔티티
 * 테이블: MOD_APPROVAL_DOCUMENT
 */
@Entity
@Table(name = "MOD_APPROVAL_DOCUMENT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DOCUMENT_ID")
    private Long documentId;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "CONTENT", columnDefinition = "TEXT")
    private String content;

    @Column(name = "REQUESTER_ID", nullable = false, length = 50)
    private String requesterId;

    @Column(name = "APPROVER_ID", length = 50)
    private String approverId;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private ApprovalStatus status;

    @Column(name = "REJECT_REASON", length = 500)
    private String rejectReason;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Builder
    public ApprovalDocument(String title, String content, String requesterId,
                            String approverId, ApprovalStatus status) {
        this.title = title;
        this.content = content;
        this.requesterId = requesterId;
        this.approverId = approverId;
        this.status = status != null ? status : ApprovalStatus.DRAFT;
    }

    // === 비즈니스 메서드 ===

    /**
     * 결재 요청 (DRAFT -> PENDING)
     */
    public void submitForApproval(String approverId) {
        if (this.status != ApprovalStatus.DRAFT) {
            throw new IllegalStateException("초안(DRAFT) 상태에서만 결재 요청이 가능합니다. 현재 상태: " + this.status);
        }
        this.approverId = approverId;
        this.status = ApprovalStatus.PENDING;
    }

    /**
     * 결재 승인 (PENDING -> APPROVED)
     */
    public void approve() {
        if (this.status != ApprovalStatus.PENDING) {
            throw new IllegalStateException("대기(PENDING) 상태에서만 승인이 가능합니다. 현재 상태: " + this.status);
        }
        this.status = ApprovalStatus.APPROVED;
    }

    /**
     * 결재 반려 (PENDING -> REJECTED)
     */
    public void reject(String reason) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new IllegalStateException("대기(PENDING) 상태에서만 반려가 가능합니다. 현재 상태: " + this.status);
        }
        this.status = ApprovalStatus.REJECTED;
        this.rejectReason = reason;
    }
}
