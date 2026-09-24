import {
KeyRound,
UserCog,
Users
} from "lucide-react";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
StatusBadge
} from "../../components/common/primitives";
import { services } from "../../services";
import { usePlatformQuery } from "../../services/queryCache";
import type { } from "../../types/domain";
import { productTerm } from "../../utils/productLexicon";

export function AdminUsersPage() {
  const {data:users,error}=usePlatformQuery({key:'admin:users',query:()=>services.operations.adminUsers()});
  const loadError=Boolean(error&&!users);

  if (loadError)
    return (
      <EmptyState
        title="Məlumat yüklənmədi"
        body="Xidmət hazırda cavab vermir."
        action={
          <Button onClick={() => window.location.reload()}>
            Yenidən yoxla
          </Button>
        }
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="Rollar və icazələr"
        title="Admin istifadəçiləri"
        description="Rolun interfeysdə göstərilməsi icazə vermir; bütün icazələri server yoxlamalıdır."
        actions={<Button disabled>Admin dəvət et</Button>}
      />
      {!users ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : (
        <div className="admin-user-list">
          {users.map((user) => (
            <article key={user.id}>
              <span>
                <UserCog size={21} />
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <StatusBadge
                status={user.status === "active" ? "approved" : "pending"}
              >
                {productTerm(user.status)}
              </StatusBadge>
              <div>
                <b>{user.role}</b>
                <small>
                  {user.twoFactorEnabled ? "2FA aktivdir" : "2FA tələb olunur"}
                </small>
              </div>
              <Button variant="ghost" disabled>
                <KeyRound size={17} />
                İcazələr
              </Button>
            </article>
          ))}
        </div>
      )}
      <section className="rbac-note">
        <Users size={21} />
        <div>
          <strong>Rol cədvəli server icazələrini müəyyən edir</strong>
          <p>
            Super Admin, Tournament Manager, Result Operator və Support
            Moderator rollarının hər xidmət üçün ayrıca icazələri olmalıdır.
          </p>
        </div>
      </section>
    </>
  );
}
