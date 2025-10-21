#!/bin/bash

#######################################
# API負荷テストスクリプト
# 
# 使い方:
#   ./load_test.sh <API_ENDPOINT>
#
# 例:
#   ./load_test.sh https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod
#######################################

set -e  # エラーが発生したら即座に終了

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#######################################
# 引数チェック
#######################################
if [ $# -eq 0 ]; then
    echo -e "${RED}エラー: APIエンドポイントが指定されていません${NC}"
    echo ""
    echo "使い方:"
    echo "  $0 <API_ENDPOINT>"
    echo ""
    echo "例:"
    echo "  $0 https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod"
    exit 1
fi

API_ENDPOINT="$1"
ITEMS_URL="${API_ENDPOINT}/items"

# URLの妥当性チェック
if [[ ! "$API_ENDPOINT" =~ ^https?:// ]]; then
    echo -e "${RED}エラー: 無効なURL形式です (http:// または https:// で始まる必要があります)${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}API負荷テストツール${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "エンドポイント: ${GREEN}${API_ENDPOINT}${NC}"
echo ""

#######################################
# 1. 接続テスト
#######################################
echo -e "${YELLOW}[1/6] 接続テスト...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ITEMS_URL}" \
    -H "Content-Type: application/json" \
    -d '{"name": "connection_test", "price": 1}')

if [ "$HTTP_CODE" == "201" ]; then
    echo -e "${GREEN}✓ 接続成功 (HTTP ${HTTP_CODE})${NC}"
else
    echo -e "${RED}✗ 接続失敗 (HTTP ${HTTP_CODE})${NC}"
    exit 1
fi
echo ""

#######################################
# 2. 基本的な機能テスト
#######################################
echo -e "${YELLOW}[2/6] 基本機能テスト (POST → GET)...${NC}"

# POSTリクエスト
RESPONSE=$(curl -s -X POST "${ITEMS_URL}" \
    -H "Content-Type: application/json" \
    -d '{"name": "テスト商品", "price": 1000}')

ITEM_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ -z "$ITEM_ID" ] || [ "$ITEM_ID" == "null" ]; then
    echo -e "${RED}✗ POSTリクエスト失敗${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ POST成功 (ID: ${ITEM_ID})${NC}"

# GETリクエスト
GET_RESPONSE=$(curl -s "${ITEMS_URL}/${ITEM_ID}")
GET_NAME=$(echo "$GET_RESPONSE" | jq -r '.name')

if [ "$GET_NAME" == "テスト商品" ]; then
    echo -e "${GREEN}✓ GET成功 (データ整合性OK)${NC}"
else
    echo -e "${RED}✗ GETリクエスト失敗またはデータ不整合${NC}"
    exit 1
fi
echo ""

#######################################
# 3. 順次リクエストテスト (10回)
#######################################
echo -e "${YELLOW}[3/6] 順次リクエストテスト (10回)...${NC}"

TOTAL_TIME=0
MIN_TIME=999999
MAX_TIME=0

for i in {1..10}; do
    START=$(date +%s.%N)
    curl -s -X POST "${ITEMS_URL}" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"sequential_test_${i}\", \"price\": 100}" > /dev/null
    END=$(date +%s.%N)
    
    DURATION=$(awk "BEGIN {printf \"%.3f\", $END - $START}")
    TOTAL_TIME=$(awk "BEGIN {printf \"%.3f\", $TOTAL_TIME + $DURATION}")
    
    # 最小・最大時間を記録
    if (( $(awk "BEGIN {print ($DURATION < $MIN_TIME)}") )); then
        MIN_TIME=$DURATION
    fi
    if (( $(awk "BEGIN {print ($DURATION > $MAX_TIME)}") )); then
        MAX_TIME=$DURATION
    fi
    
    printf "  Request %2d: %.3fs\n" $i $DURATION
done

AVG_TIME=$(awk "BEGIN {printf \"%.3f\", $TOTAL_TIME / 10}")
echo -e "${GREEN}✓ 完了${NC}"
echo "  平均応答時間: ${AVG_TIME}s"
echo "  最速: ${MIN_TIME}s"
echo "  最遅: ${MAX_TIME}s"
echo ""

#######################################
# 4. 並列リクエストテスト (10並列)
#######################################
echo -e "${YELLOW}[4/6] 並列リクエストテスト (10並列)...${NC}"

START_PARALLEL=$(date +%s.%N)
for i in {1..10}; do
    curl -s -X POST "${ITEMS_URL}" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"parallel_test_${i}\", \"price\": 100}" > /dev/null &
done
wait
END_PARALLEL=$(date +%s.%N)

PARALLEL_DURATION=$(awk "BEGIN {printf \"%.3f\", $END_PARALLEL - $START_PARALLEL}")
THROUGHPUT=$(awk "BEGIN {printf \"%.2f\", 10 / $PARALLEL_DURATION}")

echo -e "${GREEN}✓ 完了${NC}"
echo "  総時間: ${PARALLEL_DURATION}s"
echo "  スループット: ${THROUGHPUT} req/sec"
echo ""

#######################################
# 5. 高負荷テスト (50並列)
#######################################
echo -e "${YELLOW}[5/6] 高負荷テスト (50並列)...${NC}"

START_HEAVY=$(date +%s.%N)
for i in {1..50}; do
    curl -s -X POST "${ITEMS_URL}" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"heavy_test_${i}\", \"price\": 100}" > /dev/null &
done
wait
END_HEAVY=$(date +%s.%N)

HEAVY_DURATION=$(awk "BEGIN {printf \"%.3f\", $END_HEAVY - $START_HEAVY}")
HEAVY_THROUGHPUT=$(awk "BEGIN {printf \"%.2f\", 50 / $HEAVY_DURATION}")

echo -e "${GREEN}✓ 完了${NC}"
echo "  総時間: ${HEAVY_DURATION}s"
echo "  スループット: ${HEAVY_THROUGHPUT} req/sec"
echo ""

#######################################
# 6. エラーハンドリングテスト
#######################################
echo -e "${YELLOW}[6/6] エラーハンドリングテスト...${NC}"

# 存在しないIDでGET (404期待)
HTTP_404=$(curl -s -o /dev/null -w "%{http_code}" "${ITEMS_URL}/non-existent-id")
if [ "$HTTP_404" == "404" ]; then
    echo -e "${GREEN}✓ 404エラーハンドリング正常${NC}"
else
    echo -e "${RED}✗ 404エラーハンドリング異常 (HTTP ${HTTP_404})${NC}"
fi

# 不正なJSONでPOST (400期待)
HTTP_400=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ITEMS_URL}" \
    -H "Content-Type: application/json" \
    -d 'invalid json')
if [ "$HTTP_400" == "400" ]; then
    echo -e "${GREEN}✓ 400エラーハンドリング正常${NC}"
else
    echo -e "${RED}✗ 400エラーハンドリング異常 (HTTP ${HTTP_400})${NC}"
fi

# ボディなしでPOST (400期待)
HTTP_400_EMPTY=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ITEMS_URL}" \
    -H "Content-Type: application/json")
if [ "$HTTP_400_EMPTY" == "400" ]; then
    echo -e "${GREEN}✓ 空ボディエラーハンドリング正常${NC}"
else
    echo -e "${RED}✗ 空ボディエラーハンドリング異常 (HTTP ${HTTP_400_EMPTY})${NC}"
fi

echo ""

#######################################
# サマリー
#######################################
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}テスト結果サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "エンドポイント: ${API_ENDPOINT}"
echo ""
echo "【パフォーマンス】"
echo "  順次実行 (平均): ${AVG_TIME}s"
echo "  並列10件: ${PARALLEL_DURATION}s (${THROUGHPUT} req/sec)"
echo "  並列50件: ${HEAVY_DURATION}s (${HEAVY_THROUGHPUT} req/sec)"
echo ""
echo "【応答時間】"
echo "  最速: ${MIN_TIME}s"
echo "  最遅: ${MAX_TIME}s"
echo ""
echo -e "${GREEN}✓ 全テスト完了${NC}"