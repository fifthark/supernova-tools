"use client";

import { useCallback, useRef, useState } from "react";
import { parseCSV } from "@/lib/fb-ads/csv-parser";
import { parseSheetRows } from "@/lib/fb-ads/sheets-parser";
import { ParseResult, DataSource } from "@/lib/fb-ads/types";

interface Props {
  onDataLoaded: (result: ParseResult & { _fileName?: string; _source?: DataSource }) => void;
  loading: boolean;
  recordCount: number | null;
  fileName: string | null;
  sheetsConfigured?: boolean;  // true if env vars are set
}

export default function DataSourceSelector({
  onDataLoaded,
  loading,
  recordCount,
  fileName,
  sheetsConfigured = false,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [source, setSource] = useState<DataSource>("csv");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a .csv file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      onDataLoaded({ ...result, _fileName: file.name, _source: "csv" } as any);
    };
    reader.readAsText(file);
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadFromSheets = useCallback(async () => {
    setSheetsLoading(true);
    setSheetsError(null);

    try {
      const res = await fetch("/api/fb-ads/sheets");
      const data = await res.json();

      if (!res.ok) {
        setSheetsError(data.error || "Failed to load from Google Sheets");
        return;
      }

      if (!data.data || data.data.length < 2) {
        setSheetsError("Sheet is empty or has no data rows");
        return;
      }

      // Parse sheet rows (header + data) into FBAdRecords
      const result = parseSheetRows(data.data);
      onDataLoaded({ ...result, _fileName: "Google Sheets", _source: "sheets" } as any);
      setSource("sheets");
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : "Failed to connect to Google Sheets");
    } finally {
      setSheetsLoading(false);
    }
  }, [onDataLoaded]);

  const isLoaded = recordCount != null && recordCount > 0;

  return (
    <div>
      {/* Source toggle (only show if sheets is configured) */}
      {sheetsConfigured && (
        <div className="source-toggle">
          <button
            className={`source-toggle-btn ${source === "csv" ? "active" : ""}`}
            onClick={() => setSource("csv")}
          >
            CSV Upload
          </button>
          <button
            className={`source-toggle-btn ${source === "sheets" ? "active" : ""}`}
            onClick={() => setSource("sheets")}
          >
            Google Sheets
          </button>
        </div>
      )}

      {source === "csv" ? (
        // CSV Dropzone
        <div
          className={`dropzone ${dragActive ? "drag-active" : ""} ${isLoaded ? "dropzone-loaded" : ""}`}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="dropzone-icon">
            {loading ? "..." : isLoaded ? "✅" : "📄"}
          </div>
          {loading ? (
            <div>Parsing CSV...</div>
          ) : isLoaded ? (
            <div>
              <strong>{fileName}</strong>
              <br />
              {recordCount.toLocaleString()} records loaded
              <div className="dropzone-hint">Drop another CSV to replace</div>
            </div>
          ) : (
            <div>
              Drop a Facebook Ads CSV here, or click to browse
              <div className="dropzone-hint">
                Export from Ads Manager → Reports → Export (.csv)
              </div>
            </div>
          )}
        </div>
      ) : (
        // Google Sheets connection
        <div className={`dropzone ${isLoaded && fileName === "Google Sheets" ? "dropzone-loaded" : ""}`}>
          <div className="dropzone-icon">
            {sheetsLoading ? "..." : isLoaded && fileName === "Google Sheets" ? "✅" : "📊"}
          </div>
          {sheetsLoading ? (
            <div>Loading from Google Sheets...</div>
          ) : isLoaded && fileName === "Google Sheets" ? (
            <div>
              <strong>Google Sheets</strong>
              <br />
              {recordCount.toLocaleString()} records loaded
              <div className="dropzone-hint">
                <button
                  className="btn-refresh-sheets"
                  onClick={handleLoadFromSheets}
                >
                  ↻ Refresh data
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                className="btn-load-sheets"
                onClick={handleLoadFromSheets}
                disabled={sheetsLoading}
              >
                Load from Google Sheets
              </button>
              <div className="dropzone-hint">
                Data synced via Make.com from Facebook Ads Manager
              </div>
            </div>
          )}
          {sheetsError && (
            <div className="sheets-error">{sheetsError}</div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
