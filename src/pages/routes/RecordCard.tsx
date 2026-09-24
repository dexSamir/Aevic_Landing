import '../../styles/records-archive.css';
import {
ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import {
TeamLogo
} from "../../components/common/primitives";
import "../../styles/public-pages.css";
import type { RecordEntry } from "../../types/domain";
import { recordCategory,recordCategoryLabels,recordValue } from './PublicArchivePagesShared';
export function RecordCard({
  record,
  index = 0,
}: {
  record: RecordEntry;
  index?: number;
}) {
  return (
    <Link
      className="record-card"
      to={`/records?record=${record.id}#record-detail`}
    >
      <b className="record-card__index">{String(index + 1).padStart(2, "0")}</b>
      <div className="record-card__title">
        <span>{recordCategoryLabels[recordCategory(record)]}</span>
        <strong>{record.label}</strong>
      </div>
      <strong className="record-card__value">{recordValue(record)}</strong>
      <div className="record-card__team">
        <TeamLogo name={record.teamName} src={record.teamLogo} size="sm" />
        <span>
          <b>{record.teamName}</b>
          <small>{record.tournamentName}</small>
        </span>
      </div>
      <time dateTime={record.achievedAt}>
        {new Date(record.achievedAt).toLocaleDateString("az-AZ", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </time>
      <ArrowRight size={18} />
    </Link>
  );
}
