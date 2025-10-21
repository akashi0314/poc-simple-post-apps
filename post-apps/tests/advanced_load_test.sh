#!/bin/bash

#######################################
# 高度なAPI負荷テストスクリプト
# 
# 使い方:
#   ./advanced_load_test.sh <API_ENDPOINT> [OPTIONS]
#
# オプション:
#   -n <数>    リクエスト数 (デフォルト: 100)
#   -c <数>    並列実行数 (デフォルト: 10)
#   -d <秒>    各リクエスト間の遅延 (デフォルト: 0)
#   -t <秒>    タイムアウト時間 (デフォルト: 10)
#   -o <FILE>  結果を出力するファイル
#
# 例:
#   ./advanced_load_test.sh https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod
#   ./advanced_load_test.sh https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod -n 200 -c 20
#   ./advanced_load_test.sh https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod -o results.json
#######################################

set -e

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# デフォルト値
NUM_REQUESTS=100
CONCURRENCY=10
DELAY=0
TIMEOUT=10
OUTPUT_FILE=""

#######################################
# 引数解析
#######################################
if [ $# -eq 0 ]; then
    echo -e "${RED}エラー: APIエンドポイントが指定されていません${NC}"
    echo ""
    echo "使い方:"
    echo "  $0 <API_ENDPOINT> [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  -n <数>    リクエスト数 (デフォルト: 100)"
    echo "  -c <数>    並列実行数 (デフォルト: 10)"
    echo "  -d <秒>    各リクエスト間の遅延 (デフォルト: 0)"
    echo "  -t <秒>    タイムアウト時間 (デフォルト: 10)"
    echo "  -o <FILE>  結果を出力するファイル"
    echo ""
    echo "例:"
    echo "  $0 https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod"
    echo "  $0 https://xxxxx.execute-api.us-east-1.amazonaws.com/Prod -n 200 -c 20"
    exit 1
fi

API_ENDPOINT="$1"
shift

# オプション解析
while getopts "n:c:d:t:o:" opt; do
    case $opt in
        n) NUM_REQUESTS="$OPTARG" ;;
        c) CONCURRENCY="$OPTARG" ;;
        d) DELAY="$OPTARG" ;;
        t) TIMEOUT="$OPTARG" ;;
        o) OUTPUT_FILE="$OPTARG" ;;
        \?)
            echo -e "${RED}無効なオプション: -$OPTARG${NC}" >&2
            exit 1
            ;;
    esac
done

ITEMS_URL="${API_ENDPOINT}/items"

# URLの妥当性チェック
if [[ ! "$API_ENDPOINT" =~ ^https?:// ]]; then
    echo -e "${RED}エラー: 無効なURL形式です${NC}"
    exit 1
fi

# 一時ディレクトリ作成
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}高度なAPI負荷テストツール${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "エンドポイント: ${GREEN}${API_ENDPOINT}${NC}"
echo -e "リクエスト数: ${CYAN}${NUM_REQUESTS}${NC}"
echo -e "並列実行数: ${CYAN}${CONCURRENCY}${NC}"
echo -e "遅延: ${CYAN}${DELAY}秒${NC}"
echo -e "タイムアウト: ${CYAN}${TIMEOUT}秒${NC}"
echo ""

#######################################
# 接続テスト
#######################################
echo -e "${YELLOW}接続テスト中...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m "$TIMEOUT" -X POST "${ITEMS_URL}" \
    -H "Content-Type: application/json" \
    -d '{"name": "connection_test", "price": 1}')

if [ "$HTTP_CODE" == "201" ]; then
    echo -e "${GREEN}✓ 接続成功${NC}"
else
    echo -e "${RED}✗ 接続失敗 (HTTP ${HTTP_CODE})${NC}"
    exit 1
fi
echo ""

#######################################
# 負荷テスト実行
#######################################
echo -e "${YELLOW}負荷テスト開始...${NC}"
echo ""

RESULTS_FILE="${TEMP_DIR}/results.txt"
ERRORS_FILE="${TEMP_DIR}/errors.txt"
touch "$RESULTS_FILE"
touch "$ERRORS_FILE"

# プログレスバー用
PROGRESS=0
printf "${CYAN}進捗: [%-50s] %d%%${NC}\r" "" "$PROGRESS"

# 負荷テスト実行
START_TIME=$(date +%s.%N)

for ((batch=0; batch<$NUM_REQUESTS; batch+=CONCURRENCY)); do
    batch_end=$((batch + CONCURRENCY))
    if [ $batch_end -gt $NUM_REQUESTS ]; then
        batch_end=$NUM_REQUESTS
    fi
    
    for ((i=batch; i<batch_end; i++)); do
        (
            req_start=$(date +%s.%N)
            response=$(curl -s -w "\n%{http_code}\n%{time_total}" -m "$TIMEOUT" \
                -X POST "${ITEMS_URL}" \
                -H "Content-Type: application/json" \
                -d "{\"name\": \"load_test_${i}\", \"price\": $((i * 10))}" 2>&1)
            req_end=$(date +%s.%N)
            
            # レスポンスをパース
            body=$(echo "$response" | head -n -2)
            http_code=$(echo "$response" | tail -n 2 | head -n 1)
            curl_time=$(echo "$response" | tail -n 1)
            duration=$(awk "BEGIN {printf \"%.6f\", $req_end - $req_start}")
            
            # 結果を記録
            if [ "$http_code" == "201" ]; then
                echo "$i,$duration,$curl_time,$http_code" >> "$RESULTS_FILE"
            else
                echo "$i,$duration,$curl_time,$http_code,$body" >> "$ERRORS_FILE"
            fi
        ) &
    done
    
    wait
    
    # 遅延
    if [ "$DELAY" != "0" ]; then
        sleep "$DELAY"
    fi
    
    # プログレスバー更新
    PROGRESS=$(( (batch_end * 100) / NUM_REQUESTS ))
    filled=$(( PROGRESS / 2 ))
    printf "${CYAN}進捗: [%-50s] %d%%${NC}\r" $(printf '#%.0s' $(seq 1 $filled)) "$PROGRESS"
done

END_TIME=$(date +%s.%N)
TOTAL_DURATION=$(awk "BEGIN {printf \"%.3f\", $END_TIME - $START_TIME}")

echo ""
echo ""

#######################################
# 結果分析
#######################################
echo -e "${YELLOW}結果分析中...${NC}"

TOTAL_SUCCESS=$(wc -l < "$RESULTS_FILE")
TOTAL_ERRORS=$(wc -l < "$ERRORS_FILE")
SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($TOTAL_SUCCESS * 100) / $NUM_REQUESTS}")

if [ "$TOTAL_SUCCESS" -gt 0 ]; then
    # 統計計算
    AVG_TIME=$(awk -F',' '{sum+=$2; count++} END {printf "%.3f", sum/count}' "$RESULTS_FILE")
    MIN_TIME=$(awk -F',' 'NR==1{min=$2} {if($2<min) min=$2} END {printf "%.3f", min}' "$RESULTS_FILE")
    MAX_TIME=$(awk -F',' '{if($2>max) max=$2} END {printf "%.3f", max}' "$RESULTS_FILE")
    
    # パーセンタイル計算
    PERCENTILE_50=$(sort -t',' -k2 -n "$RESULTS_FILE" | awk -F',' -v n="$TOTAL_SUCCESS" 'NR==int(n*0.50){printf "%.3f", $2}')
    PERCENTILE_90=$(sort -t',' -k2 -n "$RESULTS_FILE" | awk -F',' -v n="$TOTAL_SUCCESS" 'NR==int(n*0.90){printf "%.3f", $2}')
    PERCENTILE_95=$(sort -t',' -k2 -n "$RESULTS_FILE" | awk -F',' -v n="$TOTAL_SUCCESS" 'NR==int(n*0.95){printf "%.3f", $2}')
    PERCENTILE_99=$(sort -t',' -k2 -n "$RESULTS_FILE" | awk -F',' -v n="$TOTAL_SUCCESS" 'NR==int(n*0.99){printf "%.3f", $2}')
    
    THROUGHPUT=$(awk "BEGIN {printf \"%.2f\", $NUM_REQUESTS / $TOTAL_DURATION}")
else
    AVG_TIME="N/A"
    MIN_TIME="N/A"
    MAX_TIME="N/A"
    PERCENTILE_50="N/A"
    PERCENTILE_90="N/A"
    PERCENTILE_95="N/A"
    PERCENTILE_99="N/A"
    THROUGHPUT="0"
fi

#######################################
# 結果表示
#######################################
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}テスト結果${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}【基本情報】${NC}"
echo "  エンドポイント: ${API_ENDPOINT}"
echo "  総リクエスト数: ${NUM_REQUESTS}"
echo "  並列実行数: ${CONCURRENCY}"
echo "  総実行時間: ${TOTAL_DURATION}秒"
echo ""
echo -e "${CYAN}【成功率】${NC}"
echo -e "  成功: ${GREEN}${TOTAL_SUCCESS}${NC} / ${NUM_REQUESTS} (${SUCCESS_RATE}%)"
if [ "$TOTAL_ERRORS" -gt 0 ]; then
    echo -e "  失敗: ${RED}${TOTAL_ERRORS}${NC}"
fi
echo ""
echo -e "${CYAN}【パフォーマンス】${NC}"
echo "  スループット: ${THROUGHPUT} req/sec"
echo "  平均応答時間: ${AVG_TIME}秒"
echo "  最速: ${MIN_TIME}秒"
echo "  最遅: ${MAX_TIME}秒"
echo ""
echo -e "${CYAN}【パーセンタイル】${NC}"
echo "  50%tile (中央値): ${PERCENTILE_50}秒"
echo "  90%tile: ${PERCENTILE_90}秒"
echo "  95%tile: ${PERCENTILE_95}秒"
echo "  99%tile: ${PERCENTILE_99}秒"
echo ""

# エラー詳細
if [ "$TOTAL_ERRORS" -gt 0 ]; then
    echo -e "${RED}【エラー詳細】${NC}"
    awk -F',' '{print "  Request "$1": HTTP "$4}' "$ERRORS_FILE" | head -n 10
    if [ "$TOTAL_ERRORS" -gt 10 ]; then
        echo "  ... (他 $((TOTAL_ERRORS - 10)) 件)"
    fi
    echo ""
fi

#######################################
# JSON出力
#######################################
if [ -n "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}結果をファイルに保存中...${NC}"
    
    cat > "$OUTPUT_FILE" << EOF
{
  "endpoint": "$API_ENDPOINT",
  "config": {
    "total_requests": $NUM_REQUESTS,
    "concurrency": $CONCURRENCY,
    "delay": $DELAY,
    "timeout": $TIMEOUT
  },
  "results": {
    "total_duration": $TOTAL_DURATION,
    "successful_requests": $TOTAL_SUCCESS,
    "failed_requests": $TOTAL_ERRORS,
    "success_rate": $SUCCESS_RATE,
    "throughput": $THROUGHPUT
  },
  "response_times": {
    "average": "$AVG_TIME",
    "min": "$MIN_TIME",
    "max": "$MAX_TIME",
    "percentiles": {
      "p50": "$PERCENTILE_50",
      "p90": "$PERCENTILE_90",
      "p95": "$PERCENTILE_95",
      "p99": "$PERCENTILE_99"
    }
  }
}
EOF
    
    echo -e "${GREEN}✓ 結果を ${OUTPUT_FILE} に保存しました${NC}"
    echo ""
fi

echo -e "${GREEN}✓ テスト完了${NC}"