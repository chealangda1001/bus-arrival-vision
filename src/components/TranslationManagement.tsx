import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaticTranslationEditor } from './StaticTranslationEditor';
import { DynamicTranslationEditor } from './DynamicTranslationEditor';
import { Languages, Database, Truck, Clock } from 'lucide-react';

export const TranslationManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Languages className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Translation Management</h2>
      </div>

      <Tabs defaultValue="static" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="static" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            UI Text
          </TabsTrigger>
          <TabsTrigger value="destinations" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Destinations
          </TabsTrigger>
          <TabsTrigger value="statuses" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Statuses
          </TabsTrigger>
          <TabsTrigger value="fleet-types" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Fleet Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="static" className="mt-6">
          <StaticTranslationEditor />
        </TabsContent>

        <TabsContent value="destinations" className="mt-6">
          <DynamicTranslationEditor 
            type="destinations" 
            title="Destination Translations"
            description="Manage translations for destination names"
          />
        </TabsContent>

        <TabsContent value="statuses" className="mt-6">
          <DynamicTranslationEditor 
            type="statuses" 
            title="Status Translations"
            description="Manage translations for departure statuses"
          />
        </TabsContent>

        <TabsContent value="fleet-types" className="mt-6">
          <DynamicTranslationEditor 
            type="fleet-types" 
            title="Fleet Type Translations"
            description="Manage translations for fleet types"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};