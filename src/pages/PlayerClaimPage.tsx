import { type FormEvent,useState } from "react";
import { useParams } from "react-router-dom";
import "../app/workspaceStyles";
import {
Button,
Input,
PageHeader,
Select,
Toast
} from "../components/common/primitives";
import { services } from "../services";

function formatDate(value: string) {
  return new Date(value).toLocaleString("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PlayerClaimPage() {
  const { playerId = "" } = useParams();
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await services.players.claim(
        playerId,
        data.get("method") as
          | "ACCOUNT_MATCH"
          | "PUBG_IDENTITY"
          | "ADMIN_REVIEW",
        [],
        crypto.randomUUID(),
      );
      setNotice("Claim review üçün göndərildi.");
    } catch {
      setNotice(
        "Müraciət saxlanılmadı. Yenidən cəhd edin; hesabın sizə aid olduğunu təsdiqləmək üçün əlavə yoxlama tələb oluna bilər.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Player identity"
        title="Oyunçu profilini claim et"
        description="Public oyunçu kimliyini hesabınıza bağlamaq üçün server təsdiqi tələb olunur. Profil avtomatik verilmir."
      />
      {notice && (
        <Toast
          title="Claim statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      <form className="operation-form narrow-form" onSubmit={submit}>
        <Select
          name="method"
          label="Verification üsulu"
          defaultValue="ACCOUNT_MATCH"
        >
          <option value="ACCOUNT_MATCH">Mövcud account uyğunluğu</option>
          <option value="PUBG_IDENTITY">PUBG identity verification</option>
          <option value="ADMIN_REVIEW">Admin review</option>
        </Select>
        <Input label="Player ID" value={playerId} disabled />
        <Button type="submit" loading={loading}>
          Claim review göndər
        </Button>
      </form>
    </>
  );
}
