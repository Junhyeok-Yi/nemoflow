# Post-Things 모델 라우팅 표준안 v1

## 목표
채널 성격에 맞춰 모델 비용/품질을 분리 운영한다.

- alert: 최저비용/최고속도
- dev/qa: 중간비용/균형
- hq: 고품질 의사결정

## 채널별 권장 티어

### 1) #post-things-alert
- 모델 티어: **Low (mini/nano class)**
- Reasoning: **off**
- 출력 길이: 짧게(핵심 3~6줄)
- 용도:
  - 상태 전이(진행/차단/해소/완료)
  - 리스크/일정 경고
  - QA 누락 경고

### 2) #post-things-dev
- 모델 티어: **Mid**
- Reasoning: **low**
- 출력 길이: 중간
- 용도:
  - 구현 이슈 분석
  - 작업 분해/우선순위 정리
  - 기술 대안 비교(경량)

### 3) #post-things-qa
- 모델 티어: **Mid**
- Reasoning: **low**
- 출력 길이: 중간
- 용도:
  - 테스트 케이스 요약
  - 결함 재현 스텝 정리
  - 회귀/재검증 결과 요약

### 4) #post-things-hq
- 모델 티어: **High**
- Reasoning: **medium (필요 시)**
- 출력 형식: 옵션 A/B + 추천안 + 영향(일정/리스크/비용)
- 용도:
  - 우선순위 충돌 해소
  - 범위 변경/Go-NoGo
  - 오너 의사결정 요청

## 라우팅 규칙

1. **HQ는 의사결정 필요 건만**
2. 비의사결정성 보고는 alert/dev/qa에서 처리
3. 긴 텍스트는 dev/qa에서 먼저 요약 후 HQ로 승격
4. 동일 이슈 중복 보고 금지(가장 최신 상태만 유지)

## 템플릿

### Alert 템플릿
- Type: [Status|Risk|Deadline|Recovery]
- Item: <이슈/작업>
- Impact: <일정/품질 영향>
- Next: <즉시 액션>

### HQ 템플릿
- Decision: <무엇을 결정해야 하는가>
- Option A/B: <핵심 차이>
- Recommendation: <권장안>
- Impact: <일정/리스크/비용>
- Needed by: <결정 데드라인>

## 적용 우선순위

1. alert 메시지부터 저가 모델 고정
2. dev/qa는 중간 모델 고정
3. HQ만 상위 모델 사용
4. 월 1회 비용/품질 리포트로 재조정

## 비고
현재 크론은 systemEvent 기반으로 main 세션에서 동작한다.
모델을 채널별로 강제 분리하려면:
- 채널별 분리 세션 운영 또는
- isolated agentTurn 크론(모델 지정)으로 전환
이 두 가지 중 하나를 다음 단계에서 적용한다.
