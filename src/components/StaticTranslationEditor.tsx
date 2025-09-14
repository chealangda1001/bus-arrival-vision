import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StaticTranslation {
  id: string;
  translation_key: string;
  english: string;
  khmer: string;
  chinese: string;
  category: string;
}

export const StaticTranslationEditor = () => {
  const [translations, setTranslations] = useState<StaticTranslation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTranslation, setNewTranslation] = useState({
    translation_key: '',
    english: '',
    khmer: '',
    chinese: '',
    category: 'general'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const categories = ['general', 'datetime', 'navigation', 'forms', 'messages'];

  const fetchTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from('static_translations')
        .select('*')
        .order('category', { ascending: true })
        .order('translation_key', { ascending: true });

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
  }, []);

  const handleSave = async (translation: StaticTranslation) => {
    try {
      const { error } = await supabase
        .from('static_translations')
        .update({
          english: translation.english,
          khmer: translation.khmer,
          chinese: translation.chinese,
          category: translation.category
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
    if (!newTranslation.translation_key || !newTranslation.english) {
      toast.error('Translation key and English text are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('static_translations')
        .insert([newTranslation]);

      if (error) throw error;

      setNewTranslation({
        translation_key: '',
        english: '',
        khmer: '',
        chinese: '',
        category: 'general'
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
        .from('static_translations')
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

  const filteredTranslations = translations.filter(t => {
    const matchesSearch = t.translation_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.khmer.includes(searchTerm) ||
                         t.chinese.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading translations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-key">Translation Key</Label>
                <Input
                  id="new-key"
                  value={newTranslation.translation_key}
                  onChange={(e) => setNewTranslation(prev => ({ ...prev, translation_key: e.target.value }))}
                  placeholder="e.g., welcome_message"
                />
              </div>
              <div>
                <Label htmlFor="new-category">Category</Label>
                <Select 
                  value={newTranslation.category} 
                  onValueChange={(value) => setNewTranslation(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <div>
                  <h3 className="font-semibold text-lg">{translation.translation_key}</h3>
                  <Badge variant="secondary">{translation.category}</Badge>
                </div>
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
                <EditForm 
                  translation={translation} 
                  onSave={handleSave}
                  categories={categories}
                />
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

const DisplayForm = ({ translation }: { translation: StaticTranslation }) => (
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
  onSave, 
  categories 
}: { 
  translation: StaticTranslation; 
  onSave: (t: StaticTranslation) => void;
  categories: string[];
}) => {
  const [editData, setEditData] = useState(translation);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="edit-category">Category</Label>
        <Select 
          value={editData.category} 
          onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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