import '../../styles/public-pages.css';
import { formatEventDate } from '../../utils/calendar';

export const formatDate = (value: string, withTime = false) => formatEventDate(value, { withTime });
