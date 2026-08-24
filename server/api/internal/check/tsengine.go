package check

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func engineCLIPath() string {
	if p := os.Getenv("CHECK_ENGINE_CLI"); p != "" {
		return p
	}
	candidates := []string{
		"server/shim/check-cli.mjs",
		"../shim/check-cli.mjs",
		"../../server/shim/check-cli.mjs",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	return "server/shim/check-cli.mjs"
}

func analyzeViaTS(req Request) (Response, error) {
	in, err := json.Marshal(req)
	if err != nil {
		return Response{}, err
	}
	cli := engineCLIPath()
	cmd := exec.Command("node", "--experimental-strip-types", cli)
	cmd.Stdin = bytes.NewReader(in)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return Response{}, fmt.Errorf("ts engine: %s", msg)
	}
	var res Response
	if err := json.Unmarshal(out.Bytes(), &res); err != nil {
		return Response{}, err
	}
	return res, nil
}
