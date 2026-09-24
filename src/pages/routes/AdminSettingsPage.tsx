import {
EmptyState,
PageHeader
} from '../../components/common/primitives';

export function AdminSettingsPage() {
  return <><PageHeader eyebrow="Platforma qaydaları" title="Admin parametrləri" description="Platforma konfiqurasiyası serverdə idarə olunur."/><EmptyState title="Bu səhifədən parametr dəyişmək dəstəklənmir" body="Turnir seçimlərini turnir yaratma və idarəetmə səhifələrindən dəyişin. Ümumi platforma parametrləri üçün saxlama xidməti mövcud deyil."/></>;
}
