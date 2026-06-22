$filePath = "c:\Users\Enzo\Documents\connectedNotes\src\services\StorageService.js"
$transcriptPath = "C:\Users\Enzo\.gemini\antigravity\brain\f7a70436-6e97-4e92-b309-a42b06d2771a\.system_generated\logs\transcript_full.jsonl"
$outputPath = "c:\Users\Enzo\Documents\connectedNotes\scratch\reconstructed_StorageService.js"

# Load initial content
$content = Get-Content -Path $filePath -Raw
$transcript = Get-Content -Path $transcriptPath

Write-Host "Initial length: $($content.Length) chars"

$i = 0
foreach ($line in $transcript) {
    # Only apply edits up to the start of this turn (around index 800 in transcript)
    if ($i -ge 800) {
        break
    }
    
    if ($line -like '*"name":"replace_file_content"*' -and $line -like '*StorageService.js*') {
        try {
            $obj = ConvertFrom-Json $line
            if ($obj.tool_calls) {
                foreach ($tc in $obj.tool_calls) {
                    if ($tc.name -eq "replace_file_content" -and $tc.args.TargetFile -like "*StorageService.js*") {
                        $target = $tc.args.TargetContent
                        $replacement = $tc.args.ReplacementContent
                        
                        # Normalize line endings to avoid match issues
                        $targetNormalized = $target -replace "`r`n", "`n"
                        $contentNormalized = $content -replace "`r`n", "`n"
                        
                        if ($contentNormalized.Contains($targetNormalized)) {
                            $contentNormalized = $contentNormalized.Replace($targetNormalized, $replacement)
                            $content = $contentNormalized -replace "`n", "`r`n"
                            Write-Host "Step $($i): Applied replace_file_content ($($target.Length) -> $($replacement.Length))"
                        } else {
                            Write-Warning "Step $($i): TargetContent not found in file content!"
                        }
                    }
                }
            }
        } catch {
            Write-Error "Error parsing line $($i): $_"
        }
    }
    $i++
}

$content | Out-File -FilePath $outputPath -NoNewline -Encoding utf8
Write-Host "Reconstruction complete! Saved to $outputPath"
