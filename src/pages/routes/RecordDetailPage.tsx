import '../../styles/records-archive.css';
import { Navigate,useParams } from "react-router-dom";
import "../../styles/public-pages.css";

export function RecordDetailPage() {
  const { recordId = "" } = useParams();
  return (
    <Navigate
      to={`/records?record=${encodeURIComponent(recordId)}#record-detail`}
      replace
    />
  );
}
