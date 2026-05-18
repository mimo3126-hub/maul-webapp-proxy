/**
 * Cloudflare Worker - Anthropic API 프록시
 *
 * 역할:
 *  - GitHub Pages에 올린 HTML에서 들어오는 요청을 받아서
 *  - 안전하게 보관된 API 키를 붙여 Anthropic API로 전달하고
 *  - 응답을 다시 브라우저로 돌려줍니다.
 *
 * 환경변수(필수):
 *  - ANTHROPIC_API_KEY: console.anthropic.com 에서 발급받은 API 키
 *
 * 환경변수(선택):
 *  - ALLOWED_ORIGIN: 허용할 출처. 예) "https://username.github.io"
 *                    설정하지 않거나 "*" 로 두면 모든 출처 허용 (테스트 단계에서만 권장)
 */

export default {
  async fetch(request, env) {
    // ===== CORS 설정 =====
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // ===== Preflight 요청 처리 =====
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ===== POST 만 허용 =====
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== API 키 확인 =====
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Worker에 ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // ===== 요청 본문 파싱 =====
      const body = await request.json();

      // ===== 간단한 입력 검증 =====
      if (!body.model || !body.messages) {
        return new Response(
          JSON.stringify({ error: '잘못된 요청 형식입니다. model과 messages가 필요합니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== Anthropic API 호출 =====
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const responseData = await anthropicResponse.text();

      // ===== 응답 그대로 반환 =====
      return new Response(responseData, {
        status: anthropicResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: '서버 오류: ' + error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
