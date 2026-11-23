import { ExternalLink, FileText, Mail, MapPin, Phone } from 'lucide-react';
import { DIPTI_PROFILE } from '../data/diptiProfile.ts';

export function CandidateProfileView() {
  const p = DIPTI_PROFILE;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Executive Header Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-800">
              {p.visaStatus} · {p.availability}
            </p>
            <h2 className="font-serif text-3xl font-bold text-stone-900">{p.name}</h2>
            <p className="text-sm font-medium text-stone-700">{p.headline}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {p.location}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                {p.phone}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                {p.email}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={p.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>LinkedIn Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={p.resumePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Original Resume PDF</span>
            </a>
          </div>
        </div>

        <p className="text-sm text-stone-700 leading-relaxed pt-4 border-t border-stone-100">
          {p.summary}
        </p>

        {/* Core Skill Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4 border-t border-stone-100">
          <div>
            <h3 className="text-xs font-semibold text-stone-900 mb-2">Operations</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {p.coreSkills.operations.join(' · ')}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-900 mb-2">Guest Experience</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {p.coreSkills.guestExperience.join(' · ')}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-900 mb-2">Leadership</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {p.coreSkills.leadership.join(' · ')}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-900 mb-2">Commercial</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {p.coreSkills.commercial.join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Career Timeline & Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl divide-y divide-stone-200">
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-stone-900">
              Luxury Hospitality Experience (12 Years)
            </h3>
          </div>
          {p.experience.map((exp, idx) => (
            <div key={idx} className="p-6 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">{exp.role}</h4>
                  <div className="text-xs font-medium text-amber-800">
                    {exp.property} · {exp.location}
                  </div>
                </div>
                <span className="font-mono text-xs text-stone-500 tabular-nums">
                  {exp.period}
                </span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-stone-600 leading-relaxed">
                {exp.highlights.map((h, hIdx) => (
                  <li key={hIdx}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-stone-900">
              Education &amp; Certifications
            </h3>
            <ul className="space-y-2 text-xs text-stone-600 leading-relaxed list-disc pl-4">
              {p.education.map((edu, idx) => (
                <li key={idx}>{edu}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-stone-900">Systems &amp; Languages</h3>
            <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
              <div>
                <span className="font-semibold text-stone-800">Hospitality Systems: </span>
                {p.systems.join(' · ')}
              </div>
              <div>
                <span className="font-semibold text-stone-800">Languages: </span>
                {p.languages.join(' · ')}
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-900">Uploaded CV Document</span>
              <a
                href={p.resumePdfUrl}
                download="Dipti_Basu_Mondal_Resume.pdf"
                className="text-xs font-medium text-amber-800 hover:underline"
              >
                Download PDF
              </a>
            </div>
            <iframe
              title="Dipti Basu Mondal Resume PDF"
              src={p.resumePdfUrl}
              className="w-full h-72 border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
