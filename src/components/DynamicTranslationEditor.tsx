import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Save, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface DynamicTranslation {
  id: string;
  destination_key?: string;
  status_key?: string;
  fleet_type_key?: string;
  english: string;
  khmer: string;
  chinese: string;
  operator_id?: string;
}

interface DynamicTranslationEditorProps {
  type: 'destinations' | 'statuses' | 'fleet-types';
  title: string;
  description: string;
}

export const DynamicTranslationEditor = ({ type, title, description }: DynamicTranslationEditorProps) => {
  const [translations, setTranslations] = useState<DynamicTranslation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTranslation, setNewTranslation] = useState({
    key: '',
    english: '',
    khmer: '',
    chinese: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const getTableName = () => {
    switch (type) {
      case 'destinations': return 'destination_translations';
      case 'statuses': return 'status_translations';
      case 'fleet-types': return 'fleet_type_translations';
    }
  };

  const getKeyField = () => {
    switch (type) {
      case 'destinations': return 'destination_key';
      case 'statuses': return 'status_key';
      case 'fleet-types': return 'fleet_type_key';
    }
  };

  const fetchTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from(getTableName())
        .select('*')
        .order(getKeyField(), { ascending: true });

      if (error) throw error;
      setTranslations(data || []);
    } catch (error) {
      console.error('Error fetching translations:', error);
      toast.error('Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
  }, [type]);

  const handleSave = async (translation: DynamicTranslation) => {
    try {
      const { error } = await supabase
        .from(getTableName())
        .update({
          english: translation.english,
          khmer: translation.khmer,
          chinese: translation.chinese
        })
        .eq('id', translation.id);

      if (error) throw error;
      
      setEditingId(null);
      toast.success('Translation updated successfully');
      fetchTranslations();
    } catch (error) {
      console.error('Error updating translation:', error);
      toast.error('Failed to update translation');
    }
  };

  const handleAdd = async () => {
    if (!newTranslation.key || !newTranslation.english) {
      toast.error('Key and English text are required');
      return;
    }

    try {
      const insertData: any = {
        english: newTranslation.english,
        khmer: newTranslation.khmer,
        chinese: newTranslation.chinese
      };
      
      // Set the appropriate key field based on type
      if (type === 'destinations') {
        insertData.destination_key = newTranslation.key;
        insertData.operator_id = null;
      } else if (type === 'statuses') {
        insertData.status_key = newTranslation.key;
      } else if (type === 'fleet-types') {
        insertData.fleet_type_key = newTranslation.key;
      }

      const { error } = await supabase
        .from(getTableName())
        .insert([insertData]);

      if (error) throw error;

      setNewTranslation({
        key: '',
        english: '',
        khmer: '',
        chinese: ''
      });
      setShowAddForm(false);
      toast.success('Translation added successfully');
      fetchTranslations();
    } catch (error) {
      console.error('Error adding translation:', error);
      toast.error('Failed to add translation');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from(getTableName())
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Translation deleted successfully');
      fetchTranslations();
    } catch (error) {
      console.error('Error deleting translation:', error);
      toast.error('Failed to delete translation');
    }
  };

  const getKeyValue = (translation: DynamicTranslation) => {
    return translation.destination_key || translation.status_key || translation.fleet_type_key || '';
  };

  const filteredTranslations = translations.filter(t => {
    const keyValue = getKeyValue(t);
    return keyValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
           t.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
           t.khmer.includes(searchTerm) ||
           t.chinese.includes(searchTerm);
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading translations...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search translations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Translation
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Translation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new-key">Key</Label>
              <Input
                id="new-key"
                value={newTranslation.key}
                onChange={(e) => setNewTranslation(prev => ({ ...prev, key: e.target.value }))}
                placeholder={`e.g., ${type === 'destinations' ? 'Phnom Penh' : type === 'statuses' ? 'on-time' : 'VIP Van'}`}
              />
            </div>
            <div>
              <Label htmlFor="new-english">English</Label>
              <Textarea
                id="new-english"
                value={newTranslation.english}
                onChange={(e) => setNewTranslation(prev => ({ ...prev, english: e.target.value }))}
                placeholder="English translation"
              />
            </div>
            <div>
              <Label htmlFor="new-khmer">Khmer</Label>
              <Textarea
                id="new-khmer"
                value={newTranslation.khmer}
                onChange={(e) => setNewTranslation(prev => ({ ...prev, khmer: e.target.value }))}
                placeholder="Khmer translation"
              />
            </div>
            <div>
              <Label htmlFor="new-chinese">Chinese</Label>
              <Textarea
                id="new-chinese"
                value={newTranslation.chinese}
                onChange={(e) => setNewTranslation(prev => ({ ...prev, chinese: e.target.value }))}
                placeholder="Chinese translation"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Add Translation</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredTranslations.map((translation) => (
          <Card key={translation.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg">{getKeyValue(translation)}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(editingId === translation.id ? null : translation.id)}
                  >
                    {editingId === translation.id ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(translation.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {editingId === translation.id ? (
                <EditForm translation={translation} onSave={handleSave} />
              ) : (
                <DisplayForm translation={translation} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTranslations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No translations found matching your criteria.
        </div>
      )}
    </div>
  );
};

const DisplayForm = ({ translation }: { translation: DynamicTranslation }) => (
  <div className="space-y-3">
    <div>
      <Label className="text-sm font-medium">English</Label>
      <p className="text-sm bg-muted p-2 rounded">{translation.english}</p>
    </div>
    <div>
      <Label className="text-sm font-medium">Khmer</Label>
      <p className="text-sm bg-muted p-2 rounded">{translation.khmer}</p>
    </div>
    <div>
      <Label className="text-sm font-medium">Chinese</Label>
      <p className="text-sm bg-muted p-2 rounded">{translation.chinese}</p>
    </div>
  </div>
);

const EditForm = ({ 
  translation, 
  onSave 
}: { 
  translation: DynamicTranslation; 
  onSave: (t: DynamicTranslation) => void;
}) => {
  const [editData, setEditData] = useState(translation);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="edit-english">English</Label>
        <Textarea
          id="edit-english"
          value={editData.english}
          onChange={(e) => setEditData(prev => ({ ...prev, english: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="edit-khmer">Khmer</Label>
        <Textarea
          id="edit-khmer"
          value={editData.khmer}
          onChange={(e) => setEditData(prev => ({ ...prev, khmer: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="edit-chinese">Chinese</Label>
        <Textarea
          id="edit-chinese"
          value={editData.chinese}
          onChange={(e) => setEditData(prev => ({ ...prev, chinese: e.target.value }))}
        />
      </div>
      <Button 
        onClick={() => onSave(editData)}
        className="flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        Save Changes
      </Button>
    </div>
  );
};