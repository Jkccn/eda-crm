param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Target,
  [Parameter(Mandatory = $true)][ValidateSet("excel", "word", "ppt")][string]$Kind
)

$ErrorActionPreference = "Stop"
$app = $null
$doc = $null

try {
  switch ($Kind) {
    "excel" {
      $app = New-Object -ComObject Excel.Application
      $app.Visible = $false
      $app.DisplayAlerts = $false
      # Open(FileName, UpdateLinks:=0, ReadOnly:=$true)
      $doc = $app.Workbooks.Open($Source, 0, $true)
      # 0 = xlTypePDF，等同于“导出/打印为 PDF”，保留打印布局
      $doc.ExportAsFixedFormat(0, $Target)
      $doc.Close($false)
      $app.Quit()
    }
    "word" {
      $app = New-Object -ComObject Word.Application
      $app.Visible = $false
      $app.DisplayAlerts = 0
      # Open(FileName, ConfirmConversions:=$false, ReadOnly:=$true)
      $doc = $app.Documents.Open($Source, $false, $true)
      # 17 = wdExportFormatPDF
      $doc.ExportAsFixedFormat($Target, 17)
      $doc.Close(0)
      $app.Quit()
    }
    "ppt" {
      $app = New-Object -ComObject PowerPoint.Application
      # Open(FileName, ReadOnly:=msoTrue, Untitled:=msoFalse, WithWindow:=msoFalse)
      $doc = $app.Presentations.Open($Source, -1, 0, 0)
      # 32 = ppSaveAsPDF
      $doc.SaveAs($Target, 32)
      $doc.Close()
      $app.Quit()
    }
  }
  exit 0
}
catch {
  Write-Error $_
  try { if ($doc) { $doc.Close($false) } } catch {}
  try { if ($app) { $app.Quit() } } catch {}
  exit 1
}
finally {
  if ($doc) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
  if ($app) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
