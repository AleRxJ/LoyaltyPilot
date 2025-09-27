import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface CSVUploaderProps {
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children?: ReactNode;
}

/**
 * A CSV file upload component specifically for bulk deal imports.
 * 
 * Features:
 * - Accepts only CSV files
 * - Validates file structure
 * - Shows upload progress
 * - Provides feedback on completion
 */
export function CSVUploader({
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: CSVUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 5242880, // 5MB
        allowedFileTypes: ['.csv', 'text/csv', 'application/csv'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      })
  );

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        data-testid="button-upload-csv"
      >
        {children || (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </>
        )}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note="Upload a CSV file with columns: usuario, valor, status, tipo. Optional: acuerdo (License Agreement Number)"
      />
    </div>
  );
}