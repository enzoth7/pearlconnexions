import Image from 'next/image';
import Link from 'next/link';

type Service = {
  href: string;
  title: string;
  image: string;
  alt: string;
};

export function ServicesGrid({ services }: { services: Service[] }) {
  return (
    <div className="services-grid">
      {services.map((service) => (
        <Link className="service-card" href={service.href} key={service.href}>
          <Image
            src={service.image}
            alt={service.alt}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 860px) 50vw, 33vw"
          />
          <div className="service-card-shade" aria-hidden="true" />
          <div className="service-card-content">
            <h3>{service.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
