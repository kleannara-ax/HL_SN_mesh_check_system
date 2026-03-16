package com.company.module.approval.repository;

import com.company.module.approval.entity.ApprovalDocument;
import com.company.module.approval.entity.ApprovalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalDocumentRepository extends JpaRepository<ApprovalDocument, Long> {

    /**
     * 요청자 ID로 문서 목록 조회
     */
    Page<ApprovalDocument> findByRequesterId(String requesterId, Pageable pageable);

    /**
     * 결재자 ID + 상태로 문서 목록 조회 (결재 대기함)
     */
    Page<ApprovalDocument> findByApproverIdAndStatus(String approverId, ApprovalStatus status, Pageable pageable);

    /**
     * 상태별 문서 목록 조회
     */
    List<ApprovalDocument> findByStatus(ApprovalStatus status);

    /**
     * 요청자 ID + 상태로 문서 수 조회
     */
    long countByRequesterIdAndStatus(String requesterId, ApprovalStatus status);
}
