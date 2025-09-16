import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface BulkUploadDeparturesProps {
  onUpload: (departures: any[]) => Promise<void>;
  branchId?: string;
  operatorId?: string;
}

interface DepartureRow {
  destination: string;
  departure_time: string;
  fleet_type: 'VIP Van' | 'Bus' | 'Sleeping Bus';
  plate_number?: string;
  leaving_from?: string;
  status?: string;
  estimated_time?: string;
  trip_duration?: string;
  break_duration?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ProcessingResult {
  successful: DepartureRow[];
  failed: Array<{ row: number; data: DepartureRow; errors: ValidationError[] }>;
}

const BulkUploadDepartures: React.FC<BulkUploadDeparturesProps> = ({
  onUpload,
  branchId,
  operatorId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<DepartureRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fleetTypes = ['VIP Van', 'Bus', 'Sleeping Bus'] as const;
  const statusTypes = ['on-time', 'delayed', 'boarding', 'departed'] as const;

  const generateTemplate = useCallback(() => {
    // Generate template data with proper headers
    const templateData = [
      { 
        destination: 'Phnom Penh', 
        departure_time: '8:00 AM', 
        fleet_type: 'VIP Van', 
        plate_number: 'PP-1234', 
        leaving_from: 'Terminal A',
        status: 'on-time', 
        estimated_time: '', 
        trip_duration: '3.5', 
        break_duration: '15' 
      },
      { 
        destination: 'Siem Reap', 
        departure_time: '2:30 PM', 
        fleet_type: 'Bus', 
        plate_number: 'SR-5678', 
        leaving_from: 'Gate 3',
        status: 'on-time', 
        estimated_time: '', 
        trip_duration: '5.0', 
        break_duration: '20' 
      },
      { 
        destination: 'Battambang', 
        departure_time: '10:15 AM', 
        fleet_type: 'Sleeping Bus', 
        plate_number: 'BT-9012', 
        leaving_from: 'Platform B',
        status: 'delayed', 
        estimated_time: '10:45 AM', 
        trip_duration: '4.0', 
        break_duration: '10' 
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // destination
      { wch: 12 }, // departure_time
      { wch: 15 }, // fleet_type
      { wch: 12 }, // plate_number
      { wch: 15 }, // leaving_from
      { wch: 10 }, // status
      { wch: 12 }, // estimated_time
      { wch: 12 }, // trip_duration
      { wch: 12 }  // break_duration
    ];
    ws['!cols'] = colWidths;

    // Add notes sheet
    const notesData = [
      { Field: 'destination', Required: 'YES', Format: 'Text', Example: 'Phnom Penh', Notes: 'Final destination city' },
      { Field: 'departure_time', Required: 'YES', Format: 'H:MM AM/PM', Example: '8:00 AM', Notes: '12-hour format with AM/PM' },
      { Field: 'fleet_type', Required: 'YES', Format: 'Text', Example: 'VIP Van', Notes: 'Must be: VIP Van, Bus, or Sleeping Bus' },
      { Field: 'plate_number', Required: 'NO', Format: 'Text', Example: 'PP-1234', Notes: 'Vehicle plate number' },
      { Field: 'leaving_from', Required: 'NO', Format: 'Text', Example: 'Terminal A', Notes: 'Departure location or platform' },
      { Field: 'status', Required: 'NO', Format: 'Text', Example: 'on-time', Notes: 'Must be: on-time, delayed, boarding, or departed. Defaults to on-time' },
      { Field: 'estimated_time', Required: 'NO', Format: 'H:MM AM/PM', Example: '8:15 AM', Notes: 'Only for delayed departures, 12-hour format' },
      { Field: 'trip_duration', Required: 'NO', Format: 'Number', Example: '3.5', Notes: 'Trip duration in hours' },
      { Field: 'break_duration', Required: 'NO', Format: 'Number', Example: '15', Notes: 'Break duration in minutes' }
    ];
    const notesWs = XLSX.utils.json_to_sheet(notesData);
    notesWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departures Template');
    XLSX.utils.book_append_sheet(wb, notesWs, 'Field Descriptions');

    XLSX.writeFile(wb, 'departures_bulk_upload_template.xlsx');
    toast.success('Template downloaded successfully');
  }, []);

  const generateCSVTemplate = useCallback(() => {
    const csvContent = `destination,departure_time,fleet_type,plate_number,leaving_from,status,estimated_time,trip_duration,break_duration
Phnom Penh,8:00 AM,VIP Van,PP-1234,Terminal A,on-time,,3.5,15
Siem Reap,2:30 PM,Bus,SR-5678,Gate 3,on-time,,5.0,20
Battambang,10:15 AM,Sleeping Bus,BT-9012,Platform B,delayed,10:45 AM,4.0,10`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'departures_bulk_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV template downloaded successfully');
  }, []);

  const validateTime = (timeStr: string): boolean => {
    if (!timeStr) return false;
    // Support both 12-hour (8:00 AM) and 24-hour (08:00) formats
    const time12Regex = /^(1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)$/i;
    const time24Regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return time12Regex.test(timeStr) || time24Regex.test(timeStr);
  };

  const validateRow = (row: any, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required fields
    if (!row.destination?.trim()) {
      errors.push({
        row: rowIndex + 1,
        field: 'destination',
        message: 'Destination is required',
        value: row.destination
      });
    }

    if (!row.departure_time?.trim()) {
      errors.push({
        row: rowIndex + 1,
        field: 'departure_time',
        message: 'Departure time is required',
        value: row.departure_time
      });
    } else if (!validateTime(row.departure_time)) {
      errors.push({
        row: rowIndex + 1,
        field: 'departure_time',
        message: 'Invalid time format. Use H:MM AM/PM (12-hour) or HH:MM (24-hour)',
        value: row.departure_time
      });
    }

    if (!row.fleet_type?.trim()) {
      errors.push({
        row: rowIndex + 1,
        field: 'fleet_type',
        message: 'Fleet type is required',
        value: row.fleet_type
      });
    } else if (!fleetTypes.includes(row.fleet_type)) {
      errors.push({
        row: rowIndex + 1,
        field: 'fleet_type',
        message: `Invalid fleet type. Must be one of: ${fleetTypes.join(', ')}`,
        value: row.fleet_type
      });
    }

    // Optional field validation
    if (row.estimated_time && !validateTime(row.estimated_time)) {
      errors.push({
        row: rowIndex + 1,
        field: 'estimated_time',
        message: 'Invalid time format. Use H:MM AM/PM (12-hour) or HH:MM (24-hour)',
        value: row.estimated_time
      });
    }

    if (row.status && !statusTypes.includes(row.status)) {
      errors.push({
        row: rowIndex + 1,
        field: 'status',
        message: `Invalid status. Must be one of: ${statusTypes.join(', ')}`,
        value: row.status
      });
    }

    if (row.estimated_time && !validateTime(row.estimated_time)) {
      errors.push({
        row: rowIndex + 1,
        field: 'estimated_time',
        message: 'Invalid estimated time format. Use HH:MM (24-hour format)',
        value: row.estimated_time
      });
    }

    if (row.trip_duration && (isNaN(parseFloat(row.trip_duration)) || parseFloat(row.trip_duration) <= 0)) {
      errors.push({
        row: rowIndex + 1,
        field: 'trip_duration',
        message: 'Trip duration must be a positive number (hours)',
        value: row.trip_duration
      });
    }

    if (row.break_duration && (isNaN(parseFloat(row.break_duration)) || parseFloat(row.break_duration) < 0)) {
      errors.push({
        row: rowIndex + 1,
        field: 'break_duration',
        message: 'Break duration must be a non-negative number (minutes)',
        value: row.break_duration
      });
    }

    return errors;
  };

  const parseFile = useCallback(async (selectedFile: File) => {
    try {
      setProcessing(true);
      setProgress(25);

      const fileName = selectedFile.name.toLowerCase();
      let parsedRows: any[] = [];

      if (fileName.endsWith('.csv')) {
        const text = await selectedFile.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsedRows = result.data;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
      }

      setProgress(50);

      // Validate all rows
      const allErrors: ValidationError[] = [];
      const validRows: DepartureRow[] = [];

      parsedRows.forEach((row, index) => {
        const errors = validateRow(row, index);
        allErrors.push(...errors);

        if (errors.length === 0) {
          validRows.push({
            destination: row.destination?.trim(),
            departure_time: row.departure_time?.trim(),
            fleet_type: row.fleet_type?.trim(),
            plate_number: row.plate_number?.trim() || '',
            status: row.status?.trim() || 'on-time',
            estimated_time: row.estimated_time?.trim() || '',
            trip_duration: row.trip_duration?.toString().trim() || '',
            break_duration: row.break_duration?.toString().trim() || ''
          });
        }
      });

      setProgress(75);
      setParsedData(validRows);
      setValidationErrors(allErrors);
      setShowPreview(true);
      setProgress(100);

      if (allErrors.length > 0) {
        toast.error(`Found ${allErrors.length} validation errors. Please review and fix them.`);
      } else {
        toast.success(`Successfully parsed ${validRows.length} departures. Ready to upload!`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(error instanceof Error ? error.message : 'Error parsing file');
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setShowPreview(false);
      parseFile(selectedFile);
    }
  };

  const handleBulkUpload = async () => {
    if (!parsedData.length) return;

    try {
      setProcessing(true);
      setProgress(0);

      const successful: DepartureRow[] = [];
      const failed: Array<{ row: number; data: DepartureRow; errors: ValidationError[] }> = [];

      for (let i = 0; i < parsedData.length; i++) {
        const departure = parsedData[i];
        setProgress((i / parsedData.length) * 100);

        try {
          const departureData = {
            destination: departure.destination,
            departure_time: departure.departure_time,
            fleet_type: departure.fleet_type,
            plate_number: departure.plate_number || `AUTO-${Date.now()}-${i}`,
            status: departure.status || 'on-time',
            estimated_time: departure.estimated_time || '',
            trip_duration: departure.trip_duration || '',
            break_duration: departure.break_duration || '',
            branch_id: branchId,
            is_visible: true
          };

          await onUpload([departureData]);
          successful.push(departure);
        } catch (error) {
          failed.push({
            row: i + 1,
            data: departure,
            errors: [{
              row: i + 1,
              field: 'upload',
              message: error instanceof Error ? error.message : 'Upload failed',
              value: departure
            }]
          });
        }
      }

      setResult({ successful, failed });
      setProgress(100);

      if (successful.length > 0) {
        toast.success(`Successfully uploaded ${successful.length} departures!`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} departures failed to upload. Check the results below.`);
      }
    } catch (error) {
      console.error('Error during bulk upload:', error);
      toast.error('Error during bulk upload');
    } finally {
      setProcessing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setResult(null);
    setShowPreview(false);
    setProgress(0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Bulk Upload Departures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateTemplate} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Excel Template
          </Button>
          <Button variant="outline" onClick={generateCSVTemplate} className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Download CSV Template
          </Button>
        </div>

        {/* File Upload */}
        <div>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={processing}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Supported formats: Excel (.xlsx, .xls) and CSV (.csv)
          </p>
        </div>

        {/* Progress */}
        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Found {validationErrors.length} validation errors:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm">
                      Row {error.row}, {error.field}: {error.message}
                      {error.value && <span className="text-muted-foreground"> (value: "{error.value}")</span>}
                    </div>
                  ))}
                  {validationErrors.length > 10 && (
                    <p className="text-sm text-muted-foreground">...and {validationErrors.length - 10} more errors</p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview and Upload */}
        {showPreview && (
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview ({parsedData.length} valid)</TabsTrigger>
              {validationErrors.length > 0 && (
                <TabsTrigger value="errors">Errors ({validationErrors.length})</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              {parsedData.length > 0 && (
                <>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Destination</th>
                          <th className="p-2 text-left">Time</th>
                          <th className="p-2 text-left">Fleet Type</th>
                          <th className="p-2 text-left">Plate</th>
                          <th className="p-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{row.destination}</td>
                            <td className="p-2">{row.departure_time}</td>
                            <td className="p-2">{row.fleet_type}</td>
                            <td className="p-2">{row.plate_number || 'Auto-generated'}</td>
                            <td className="p-2">
                              <Badge variant="secondary">{row.status || 'on-time'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 10 && (
                      <p className="p-2 text-center text-muted-foreground">
                        ...and {parsedData.length - 10} more rows
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleBulkUpload} 
                      disabled={processing || parsedData.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload {parsedData.length} Departures
                    </Button>
                    <Button variant="outline" onClick={resetUpload}>
                      Reset
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="errors">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm p-2 bg-destructive/10 rounded">
                    <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Row {error.row}</span> - {error.field}: {error.message}
                      {error.value && (
                        <div className="text-muted-foreground">Value: "{error.value}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>{result.successful.length} successful</span>
              </div>
              {result.failed.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>{result.failed.length} failed</span>
                </div>
              )}
            </div>

            {result.failed.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Failed uploads:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {result.failed.map((item, index) => (
                        <div key={index} className="text-sm">
                          Row {item.row} ({item.data.destination} - {item.data.departure_time}): 
                          {item.errors.map(e => e.message).join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUploadDepartures;