// En journalanteckning. Synlighetsnivån kommer från backend och visas som tagg.
const VISIBILITY_LABEL = {
  PRIVATE: "Privat",
  STAFF: "Vårdpersonal",
  ALL: "Alla",
};

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("sv-SE");
}

export default function JournalEntry({ entry }) {
  return (
    <li className="entry">
      <div className="entry-head">
        <strong>{entry.authorName}</strong>
        <span className={`tag tag-${entry.visibility.toLowerCase()}`}>
          {VISIBILITY_LABEL[entry.visibility] || entry.visibility}
        </span>
        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
      </div>
      <p>{entry.content}</p>
    </li>
  );
}
