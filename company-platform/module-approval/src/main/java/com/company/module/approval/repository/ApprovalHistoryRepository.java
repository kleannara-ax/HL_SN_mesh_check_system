package com.company.module.approval.repository;

import com.company.module.approval.entity.ApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {

    /**
     * 문서 ID로 이력 조회 (최신순)
     */
    List<ApprovalHistory> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
