package com.company.module.approval.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 결재 요청 (제출) DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class ApprovalSubmitRequest {

    @NotBlank(message = "결재자 ID는 필수 입력 항목입니다.")
    @Size(max = 50, message = "결재자 ID는 50자를 초과할 수 없습니다.")
    private String approverId;
}
